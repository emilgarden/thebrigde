import { Magnetometer } from 'expo-sensors';
import type { Subscription } from 'expo-sensors/build/DeviceSensor';

export interface MagReading {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  timestamp: number;
}

const FOREGROUND_INTERVAL_MS = 250; // 4 Hz per spec

let subscription: Subscription | null = null;

export async function start(onUpdate: (r: MagReading) => void): Promise<boolean> {
  const available = await Magnetometer.isAvailableAsync();
  if (!available) {
    console.warn('[mag] sensor ikke tilgjengelig');
    return false;
  }
  Magnetometer.setUpdateInterval(FOREGROUND_INTERVAL_MS);
  subscription = Magnetometer.addListener((m) => {
    const magnitude = Math.sqrt(m.x * m.x + m.y * m.y + m.z * m.z);
    onUpdate({
      x: m.x,
      y: m.y,
      z: m.z,
      magnitude,
      timestamp: m.timestamp,
    });
  });
  return true;
}

export function stop(): void {
  subscription?.remove();
  subscription = null;
}
