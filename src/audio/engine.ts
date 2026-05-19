/**
 * Audio engine — AudioContext, masterchain, lifecycle, sensormodulasjon.
 *
 * Iter 0–1: Lag 0/1/2 parallelt med statiske parametere.
 * Iter 3: Lagene moduleres av fusion-data via 5 Hz oppdateringsløkke.
 *   • Lag 0  carrier   ← baro_dalt (smoothet) → pitch ±2 Hz
 *   • Lag 0+ speedPulse← speedKmh + hasGpsFix → LFO 0..0.56 Hz på
 *                        50 Hz sub. Fader inn 4 s ved fart, ut 8 s
 *                        ved tap. Driver "hvor fort beveger jeg meg".
 *   • Lag 1  atmosfære ← statisk wet 0.20 (motion er åpenbart, ikke usynlig)
 *   • Lag 2  tekstur   ← log(mag_dev) → bandpass 250–3500 Hz (kontinuerlig,
 *                        ingen fase-gate — magnetfelt er primær usynlig dimensjon)
 * Iter 4: Lag 3 — BAM-events (pinger + glissando) og NST-sekvenser.
 *   • events-node opprettes ved start, debounce + pattern eies av
 *     eventScheduler, trigger-regler i eventTriggers. Hver tikk evalueres
 *     mag + baro mot terskler og scheduler.tryFire(...) kalles.
 *   • Fyrte hendelser logges i state/eventLog for UI-strip.
 *   • nst-node + nstScheduler kjører som uavhengig løkke: tilfeldig
 *     sekvens hvert 22–50 s, panning ±0.3 per sekvens. NST avbrytes
 *     aldri av sensor-events (CURSOR.md punkt 3).
 *
 * Fase-detektor (`phase.update`) kjøres fortsatt slik at UI får statusvisning.
 * Den brukes ikke til å modulere lyd direkte — flyttes til fusion for
 * intern bruk (mag-baseline-rekalibrering) i en kommende iterasjon.
 *
 * Eksterne kontrakter:
 *   initAudioSession()  — én gang ved app-oppstart
 *   start()             — start lyd + modulasjon. Idempotent.
 *   stop()              — stopp lyd + modulasjon. Idempotent.
 *   isRunning()         — sannhetsverdi.
 *   subscribe(cb)       — lytt på tilstandsendringer.
 */

import {
  AudioContext,
  AudioManager,
  GainNode,
  PlaybackNotificationManager,
} from 'react-native-audio-api';
import { createCarrier, CarrierNode } from './nodes/carrier';
import { createAtmosphere, AtmosphereNode } from './nodes/atmosphere';
import { createTexture, TextureNode } from './nodes/texture';
import { createSpeedPulse, SpeedPulseNode } from './nodes/speedPulse';
import { createEvents, EventsNode } from './nodes/events';
import { createNst, NstNode } from './nodes/nst';
import { createNstScheduler, NstScheduler } from './nstScheduler';
import {
  createEventScheduler,
  defaultClock,
  EventScheduler,
} from './eventScheduler';
import { createEventTriggers, EventTriggers } from './eventTriggers';
import * as eventLog from '../state/eventLog';
import * as fusion from '../sensors/fusion';
import * as phase from './phase';
import {
  baroDeltaToPitchHz,
  magToControl,
  magControlToBandpassHz,
  smooth,
} from './modulation';

const FADE_TIME = 0.5;
const MODULATION_INTERVAL_MS = 200; // 5 Hz
const SMOOTH_ALPHA = 0.35; // ekstra glatting i modulasjonsløkken

const NOTIFICATION_BASE = {
  title: 'Bridge',
  artist: 'Ambient sensor stream',
} as const;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let carrier: CarrierNode | null = null;
let atmosphere: AtmosphereNode | null = null;
let texture: TextureNode | null = null;
let speedPulse: SpeedPulseNode | null = null;
let events: EventsNode | null = null;
let scheduler: EventScheduler | null = null;
let triggers: EventTriggers | null = null;
let schedulerUnsubscribe: (() => void) | null = null;
let nst: NstNode | null = null;
let nstScheduler: NstScheduler | null = null;
let sessionConfigured = false;

let modulationIv: ReturnType<typeof setInterval> | null = null;

// Smoothede kontrollverdier (oppdateres hver tikk)
let smoothPitch = 0;
let smoothBandpass = 400;

type StateListener = (running: boolean) => void;
const listeners = new Set<StateListener>();

function emit(running: boolean): void {
  for (const l of listeners) l(running);
}

export function subscribe(listener: StateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function initAudioSession(): void {
  AudioManager.setAudioSessionOptions({
    iosCategory: 'playback',
    iosMode: 'default',
    iosOptions: [],
  });

  PlaybackNotificationManager.addEventListener(
    'playbackNotificationPlay',
    () => {
      void start();
    }
  );
  PlaybackNotificationManager.addEventListener(
    'playbackNotificationPause',
    () => {
      void stop();
    }
  );
  PlaybackNotificationManager.addEventListener(
    'playbackNotificationStop',
    () => {
      void stop().then(() => PlaybackNotificationManager.hide());
    }
  );

  void PlaybackNotificationManager.enableControl('nextTrack', false);
  void PlaybackNotificationManager.enableControl('previousTrack', false);
  void PlaybackNotificationManager.enableControl('skipForward', false);
  void PlaybackNotificationManager.enableControl('skipBackward', false);

  sessionConfigured = true;
}

function modulationTick(): void {
  if (!carrier || !atmosphere || !texture || !speedPulse) return;

  const s = fusion.getState();
  const nextPitch = baroDeltaToPitchHz(s.altitudeDelta);
  const magCtl = magToControl(s.magDeviation);
  const nextBandpass = magControlToBandpassHz(magCtl);

  smoothPitch = smooth(smoothPitch, nextPitch, SMOOTH_ALPHA);
  smoothBandpass = smooth(smoothBandpass, nextBandpass, SMOOTH_ALPHA);

  carrier.setPitchOffset(smoothPitch);
  texture.setBandpassFreq(smoothBandpass);

  // Speed Pulse: ingen smoothing i engine-laget — noden har egne 4/8 s
  // gain-ramps og 1 s LFO-freq-ramp som er glatting nok.
  speedPulse.setSpeed(s.speedKmh, s.hasGpsFix);

  // BAM-event-triggere evalueres på samme rate (5 Hz) — debounce
  // håndteres internt av scheduler.
  if (triggers) triggers.evaluate(s);

  // Fase-detektor kjøres for UI-status. Lyd-kobling er fjernet —
  // motion er åpenbart for bruker og skal ikke styre primær-lagene.
  phase.update(s.motionIntensity);
}

export async function start(): Promise<void> {
  if (!sessionConfigured) {
    console.warn('[engine] start() før initAudioSession() — initialiserer nå');
    initAudioSession();
  }
  if (ctx) return;

  await AudioManager.setAudioSessionActivity(true);

  ctx = new AudioContext();

  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  carrier = createCarrier(ctx);
  atmosphere = createAtmosphere(ctx);
  texture = createTexture(ctx);
  speedPulse = createSpeedPulse(ctx);
  events = createEvents(ctx);
  nst = createNst(ctx);
  carrier.output.connect(master);
  atmosphere.output.connect(master);
  texture.output.connect(master);
  speedPulse.output.connect(master);
  events.output.connect(master);
  nst.output.connect(master);

  scheduler = createEventScheduler(events, defaultClock(ctx));
  triggers = createEventTriggers(scheduler);
  schedulerUnsubscribe = scheduler.subscribe((e) => eventLog.record(e));

  nstScheduler = createNstScheduler(nst);
  nstScheduler.start();

  const now = ctx.currentTime;
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(1.0, now + FADE_TIME);

  // Reset smoothede kontrollverdier til nøytrale start-verdier
  smoothPitch = 0;
  smoothBandpass = 400;

  phase.reset();

  modulationIv = setInterval(modulationTick, MODULATION_INTERVAL_MS);

  await PlaybackNotificationManager.show({
    ...NOTIFICATION_BASE,
    state: 'playing',
  });

  emit(true);
}

export async function stop(): Promise<void> {
  if (!ctx || !master) return;

  if (modulationIv) {
    clearInterval(modulationIv);
    modulationIv = null;
  }

  const now = ctx.currentTime;
  const currentMaster = master;
  const currentCtx = ctx;
  const currentLayers = [
    carrier,
    atmosphere,
    texture,
    speedPulse,
    events,
    nst,
  ].filter(
    (
      l
    ): l is
      | CarrierNode
      | AtmosphereNode
      | TextureNode
      | SpeedPulseNode
      | EventsNode
      | NstNode => l !== null
  );

  currentMaster.gain.cancelScheduledValues(now);
  currentMaster.gain.setValueAtTime(currentMaster.gain.value, now);
  currentMaster.gain.linearRampToValueAtTime(0, now + FADE_TIME);

  if (schedulerUnsubscribe) {
    schedulerUnsubscribe();
    schedulerUnsubscribe = null;
  }
  if (nstScheduler) {
    nstScheduler.stop();
    nstScheduler = null;
  }

  ctx = null;
  master = null;
  carrier = null;
  atmosphere = null;
  texture = null;
  speedPulse = null;
  events = null;
  scheduler = null;
  triggers = null;
  nst = null;

  emit(false);

  await PlaybackNotificationManager.show({
    ...NOTIFICATION_BASE,
    state: 'paused',
  });

  setTimeout(async () => {
    for (const layer of currentLayers) layer.dispose();
    await currentCtx.close();
    await AudioManager.setAudioSessionActivity(false);
  }, (FADE_TIME + 0.1) * 1000);
}

export function isRunning(): boolean {
  return ctx !== null;
}
