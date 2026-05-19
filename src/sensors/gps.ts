import * as Location from 'expo-location';

export interface GpsReading {
  speed: number; // m/s, -1 hvis ikke tilgjengelig
  heading: number; // grader fra nord, -1 hvis ukjent
  latitude: number;
  longitude: number;
  accuracy: number; // meter
  timestamp: number;
}

let watcher: Location.LocationSubscription | null = null;

export async function requestPermission(): Promise<'granted' | 'denied'> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

export async function start(
  onUpdate: (r: GpsReading) => void
): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  // BestForNavigation slår på kontinuerlig satellitt-GPS + sensor-fusion
  // for å gi maksimal presisjon og hyppighet. Forventet batteri-impact
  // ~3-4× balanced-modus, men nødvendig for å fange hastighet/heading
  // gjennom korte åpne segmenter (inn-/utgang av tunnel, stasjon).
  watcher = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 1, // meter
      timeInterval: 1000, // ms
    },
    (loc) => {
      onUpdate({
        speed: loc.coords.speed ?? -1,
        heading: loc.coords.heading ?? -1,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? -1,
        timestamp: loc.timestamp,
      });
    }
  );
  return true;
}

export function stop(): void {
  watcher?.remove();
  watcher = null;
}
