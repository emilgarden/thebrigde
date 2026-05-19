/**
 * Gyroskop — angulær hastighet rundt enhetsens X/Y/Z-akser i rad/s.
 *
 * iOS-konvensjon for naturlig portrett-orientering:
 *   x → rotasjon rundt kortakse (pitch, "nikke")
 *   y → rotasjon rundt lengdeakse (roll, "vri")
 *   z → rotasjon rundt skjermnormal (yaw, "vende")
 *
 * Yaw er den vi forventer fra svingdører og kroppsvendinger.
 * Magnitude gir total rotasjonsintensitet uavhengig av akse.
 */

import { Gyroscope } from 'expo-sensors';
import type { Subscription } from 'expo-sensors/build/DeviceSensor';

export interface GyroReading {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  timestamp: number;
}

const FOREGROUND_INTERVAL_MS = 100; // 10 Hz — gyro varierer raskt

let subscription: Subscription | null = null;

export async function start(
  onUpdate: (r: GyroReading) => void
): Promise<boolean> {
  const available = await Gyroscope.isAvailableAsync();
  if (!available) {
    console.warn('[gyro] sensor ikke tilgjengelig');
    return false;
  }
  Gyroscope.setUpdateInterval(FOREGROUND_INTERVAL_MS);
  subscription = Gyroscope.addListener((g) => {
    const magnitude = Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z);
    onUpdate({
      x: g.x,
      y: g.y,
      z: g.z,
      magnitude,
      timestamp: Date.now(),
    });
  });
  return true;
}

export function stop(): void {
  subscription?.remove();
  subscription = null;
}
