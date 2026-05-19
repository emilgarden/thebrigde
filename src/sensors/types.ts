/**
 * Sentral tilstand som alle sensorer skriver til.
 * Audio-lagene leser kun herfra — aldri direkte fra sensorene.
 */

export interface FusedState {
  // Magnetometer — i µT
  mag: {
    x: number;
    y: number;
    z: number;
    magnitude: number;
  };
  magBaseline: number | null; // null til kalibrering er ferdig
  magDeviation: number; // |magnitude - baseline|, 0+
  magPan: number; // -1 til +1, basert på x-akse

  // Barometer
  baro: {
    pressure: number; // hPa
    relativeAltitude: number | null; // meter (iOS), null på Android
  };
  altitudeDelta: number; // meter siden forrige stabile prøve

  // Akselerometer — i m/s²
  accel: {
    x: number;
    y: number;
    z: number;
    magnitude: number;
  };
  motionIntensity: number; // 0–1, smoothet

  // Gyroskop — i rad/s
  gyro: {
    x: number; // pitch-rate
    y: number; // roll-rate
    z: number; // yaw-rate (svingdør, kroppsvending)
    magnitude: number;
  };
  rotationIntensity: number; // 0–1, smoothet magnitude

  // GPS
  speed: number; // m/s, -1 hvis ikke tilgjengelig
  speedKmh: number;
  heading: number; // grader fra nord, -1 hvis ukjent

  // Status
  permissions: {
    location: 'undetermined' | 'granted' | 'denied';
  };
  calibrating: boolean; // første 10s for magnetometer-baseline
  hasGpsFix: boolean;
}

export const initialFusedState: FusedState = {
  mag: { x: 0, y: 0, z: 0, magnitude: 0 },
  magBaseline: null,
  magDeviation: 0,
  magPan: 0,
  baro: { pressure: 0, relativeAltitude: null },
  altitudeDelta: 0,
  accel: { x: 0, y: 0, z: 0, magnitude: 0 },
  motionIntensity: 0,
  gyro: { x: 0, y: 0, z: 0, magnitude: 0 },
  rotationIntensity: 0,
  speed: -1,
  speedKmh: 0,
  heading: -1,
  permissions: { location: 'undetermined' },
  calibrating: false,
  hasGpsFix: false,
};
