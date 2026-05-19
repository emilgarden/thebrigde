import { Accelerometer } from 'expo-sensors';
import type { Subscription } from 'expo-sensors/build/DeviceSensor';

export interface AccelReading {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  timestamp: number;
}

const FOREGROUND_INTERVAL_MS = 50; // 20 Hz per spec

// Expo gir akselerasjon i g (1g ≈ 9.81 m/s²) — vi konverterer.
const G = 9.81;

let subscription: Subscription | null = null;

export async function start(onUpdate: (r: AccelReading) => void): Promise<boolean> {
  const available = await Accelerometer.isAvailableAsync();
  if (!available) {
    console.warn('[accel] sensor ikke tilgjengelig');
    return false;
  }
  Accelerometer.setUpdateInterval(FOREGROUND_INTERVAL_MS);
  subscription = Accelerometer.addListener((a) => {
    const x = a.x * G;
    const y = a.y * G;
    const z = a.z * G;
    onUpdate({
      x,
      y,
      z,
      magnitude: Math.sqrt(x * x + y * y + z * z),
      timestamp: a.timestamp,
    });
  });
  return true;
}

export function stop(): void {
  subscription?.remove();
  subscription = null;
}
