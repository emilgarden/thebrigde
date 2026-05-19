/**
 * Sensorfusion — sentral state-machine for alle sensorer.
 *
 * Eksterne kontrakter:
 *   start()       — initialiserer alle sensorer (request location permission).
 *   stop()        — stopper alle subscriptions.
 *   subscribe(cb) — abonner på state-oppdateringer.
 *   getState()    — siste tilstand.
 *
 * Audio-lagene (fra Iter 3) leser kun fra denne modulen,
 * aldri direkte fra individuelle sensor-filer.
 */

import * as Magnetometer from './magnetometer';
import * as Barometer from './barometer';
import * as Accelerometer from './accelerometer';
import * as Gyroscope from './gyroscope';
import * as Gps from './gps';
import { FusedState, initialFusedState } from './types';

// Smoothing-konstant for akselerometer (eksponentielt glidende gjennomsnitt)
const ACCEL_SMOOTH_ALPHA = 0.15;
const GYRO_SMOOTH_ALPHA = 0.20;
const GYRO_NORM_DENOMINATOR = 3.0; // rad/s — observert maks under bevegelse
const G = 9.81;

// Magnetometer-kalibrering: samle prøver i N ms
const MAG_CALIBRATION_MS = 10_000;

// EMA på rå mag-magnitude før den blir til deviation. Dette demper
// enkelt-spikes fra PC-skjerm, lysrør, motorer, osv. som ellers gir
// audible knitring ved sweep gjennom bandpass-resonansen.
// α=0.3 ved 4 Hz mag-sampling → tidskonstant ~0.8s.
const MAG_SMOOTH_ALPHA = 0.3;

// Barometer: utelukk støy ved differensiering
const BARO_ALTITUDE_DELTA_FACTOR = 8.0; // per spec: meter per hPa

let state: FusedState = { ...initialFusedState };
const listeners = new Set<(s: FusedState) => void>();
let running = false;

// Kalibrerings-akkumulator
let calibrationStartMs: number | null = null;
let calibrationSamples: number[] = [];

// Smoothing-tilstand
let smoothedMotion = 0;
let smoothedRotation = 0;
let smoothedMagMagnitude: number | null = null;

// Barometer baseline for delta-beregning
let lastBaroPressure: number | null = null;

function emit(): void {
  for (const l of listeners) l(state);
}

function patch(p: Partial<FusedState>): void {
  state = { ...state, ...p };
  emit();
}

function onMag(r: Magnetometer.MagReading): void {
  // Glatt rå magnitude før deviation regnes — fjerner enkelt-spikes
  // som ellers gir hørbar knitring i bandpass-tekstur.
  if (smoothedMagMagnitude === null) {
    smoothedMagMagnitude = r.magnitude;
  } else {
    smoothedMagMagnitude =
      smoothedMagMagnitude * (1 - MAG_SMOOTH_ALPHA) +
      r.magnitude * MAG_SMOOTH_ALPHA;
  }

  // Kalibrering: samle rå prøver (ikke smoothede) for å få
  // baseline av faktiske avlesninger.
  if (calibrationStartMs !== null && state.magBaseline === null) {
    const elapsed = Date.now() - calibrationStartMs;
    calibrationSamples.push(r.magnitude);
    if (elapsed >= MAG_CALIBRATION_MS) {
      const avg =
        calibrationSamples.reduce((s, v) => s + v, 0) /
        calibrationSamples.length;
      patch({
        magBaseline: avg,
        calibrating: false,
      });
      calibrationSamples = [];
    }
  }

  const baseline = state.magBaseline;
  const deviation =
    baseline === null
      ? 0
      : Math.abs(smoothedMagMagnitude - baseline);
  // Panning fra x-akse, normalisert ved baseline-magnitude som referanse
  const refMag = baseline ?? r.magnitude;
  const pan = refMag > 0 ? Math.max(-1, Math.min(1, r.x / refMag)) : 0;

  patch({
    mag: { x: r.x, y: r.y, z: r.z, magnitude: r.magnitude },
    magDeviation: deviation,
    magPan: pan,
  });
}

function onBaro(r: Barometer.BaroReading): void {
  let delta = state.altitudeDelta;
  if (lastBaroPressure !== null) {
    delta = (lastBaroPressure - r.pressure) * BARO_ALTITUDE_DELTA_FACTOR;
  }
  lastBaroPressure = r.pressure;

  patch({
    baro: { pressure: r.pressure, relativeAltitude: r.relativeAltitude },
    altitudeDelta: delta,
  });
}

function onAccel(r: Accelerometer.AccelReading): void {
  // Fjern gravitasjon — det vi er ute etter er aktiv bevegelse, ikke statisk orientering
  const dynamic = Math.abs(r.magnitude - G);
  // Normaliser: ved ~0.3 m/s² er vi i rolig gange, ~3 m/s² er hard bevegelse
  const normalized = Math.min(1, dynamic / 3);
  smoothedMotion =
    smoothedMotion * (1 - ACCEL_SMOOTH_ALPHA) +
    normalized * ACCEL_SMOOTH_ALPHA;

  const updates: Partial<FusedState> = {
    accel: { x: r.x, y: r.y, z: r.z, magnitude: r.magnitude },
    motionIntensity: smoothedMotion,
  };

  // Stale-GPS-override: når accel er sikker på ro og iOS har sluttet å
  // fyre nye GPS-callbacks, override evt. frosset speedKmh til 0.
  const gpsStale = Date.now() - lastGpsCallbackMs > GPS_STALE_MS;
  if (
    gpsStale &&
    smoothedMotion < ACCEL_STILL_THRESHOLD &&
    state.speedKmh > 0
  ) {
    updates.speed = 0;
    updates.speedKmh = 0;
  }

  patch(updates);
}

function onGyro(r: Gyroscope.GyroReading): void {
  const normalized = Math.min(1, r.magnitude / GYRO_NORM_DENOMINATOR);
  smoothedRotation =
    smoothedRotation * (1 - GYRO_SMOOTH_ALPHA) +
    normalized * GYRO_SMOOTH_ALPHA;

  patch({
    gyro: { x: r.x, y: r.y, z: r.z, magnitude: r.magnitude },
    rotationIntensity: smoothedRotation,
  });
}

// Dødbånd: når akselerometer bekrefter ro, ignoreres GPS-jitter.
// GPS rapporterer typisk 0–5 km/h ghost speed selv på stillesittende
// telefon pga ±3-5 m posisjonsstøy. Vi krever konsensus fra accel.
//
// MOTION_REST_THRESHOLD 0.15 er valgt høyere enn idealkasse (~0.02 på
// stille flat overflate) for å tåle pultvibrasjoner fra typing,
// klimaanlegg, og trafikk-bakgrunn.
const GPS_DEADBAND_MS = 1.5; // 5.4 km/h
const MOTION_REST_THRESHOLD = 0.15;

// Stale-GPS-override: iOS slutter å fyre callbacks når enheten faktisk
// står stille. Da blir state.speedKmh frosset på siste verdi. Når
// akselerometer (20 Hz) er sterkt overbevist om ro OG GPS ikke har fyrt
// på en stund, nuller vi fart-verdien fra accel-callbacken.
const ACCEL_STILL_THRESHOLD = 0.05; // motion_i godt under "kan være tog"
const GPS_STALE_MS = 3_000;

let lastGpsCallbackMs = 0;

function onGps(r: Gps.GpsReading): void {
  lastGpsCallbackMs = Date.now();
  const rawSpeed = r.speed >= 0 ? r.speed : 0;
  const gpsLikelyStationary =
    rawSpeed < GPS_DEADBAND_MS &&
    state.motionIntensity < MOTION_REST_THRESHOLD;
  const effectiveSpeed = gpsLikelyStationary ? 0 : rawSpeed;

  patch({
    speed: gpsLikelyStationary ? 0 : r.speed,
    speedKmh: effectiveSpeed * 3.6,
    heading: r.heading,
    hasGpsFix: r.speed >= 0 || r.accuracy > 0,
  });
}

export async function start(): Promise<void> {
  if (running) return;
  running = true;

  // Start magnetometer-kalibrering
  calibrationStartMs = Date.now();
  calibrationSamples = [];
  lastGpsCallbackMs = Date.now();
  patch({ calibrating: true });

  await Magnetometer.start(onMag);
  await Barometer.start(onBaro);
  await Accelerometer.start(onAccel);
  await Gyroscope.start(onGyro);

  // Posisjon krever runtime-permission
  const perm = await Gps.requestPermission();
  patch({ permissions: { location: perm } });
  if (perm === 'granted') {
    await Gps.start(onGps);
  }
}

export function stop(): void {
  if (!running) return;
  Magnetometer.stop();
  Barometer.stop();
  Accelerometer.stop();
  Gyroscope.stop();
  Gps.stop();
  running = false;
  lastBaroPressure = null;
  calibrationStartMs = null;
  calibrationSamples = [];
  smoothedMotion = 0;
  smoothedRotation = 0;
  smoothedMagMagnitude = null;
  state = { ...initialFusedState };
  emit();
}

export function subscribe(listener: (s: FusedState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function getState(): FusedState {
  return state;
}

export function isRunning(): boolean {
  return running;
}
