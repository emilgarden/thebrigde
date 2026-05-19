import { Barometer } from 'expo-sensors';
import type { Subscription } from 'expo-sensors/build/DeviceSensor';

export interface BaroReading {
  pressure: number; // hPa
  relativeAltitude: number | null; // meter, kun iOS
  timestamp: number;
}

const FOREGROUND_INTERVAL_MS = 1000; // 1 Hz per spec

let subscription: Subscription | null = null;

export async function start(onUpdate: (r: BaroReading) => void): Promise<boolean> {
  const available = await Barometer.isAvailableAsync();
  if (!available) {
    console.warn('[baro] sensor ikke tilgjengelig');
    return false;
  }
  Barometer.setUpdateInterval(FOREGROUND_INTERVAL_MS);
  subscription = Barometer.addListener((b) => {
    onUpdate({
      pressure: b.pressure,
      relativeAltitude: b.relativeAltitude ?? null,
      timestamp: b.timestamp,
    });
  });
  return true;
}

export function stop(): void {
  subscription?.remove();
  subscription = null;
}
