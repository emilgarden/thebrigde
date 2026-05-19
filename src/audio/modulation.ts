/**
 * Modulasjon — rene funksjoner som mapper sensorverdier til
 * audio-kontrollparametere i området 0..1 eller direkte Hz/dB.
 *
 * Designprinsipper:
 *   • Pure functions, ingen side-effekter, ingen state.
 *   • Klipping og saturasjon innebygd så ekstreme verdier ikke ødelegger lyden.
 *   • Logaritmiske skalaer der menneskelig hørsel forventer det (frekvens).
 *
 * Konstantene er basert på datagrunnlag fra opptak Nydalen↔Pilestredet
 * 2026-05-19 (se canvas sensor-trip-analysis).
 */

const LOG_DENOMINATOR = Math.log10(2000);

/**
 * Magnetisk avvik i µT → normalisert kontrollverdi 0..1.
 *
 * Observert dynamikk: 0–1 579 µT (peak T-bane). Linear-mapping ville
 * gitt 99 % av brukstiden i nedre 5 % av området.
 *
 * log10(1+x)/log10(2000) gir:
 *   x =   0 µT → 0.000
 *   x =  10 µT → 0.316
 *   x =  40 µT → 0.486 (spec'ens "alarm"-grense)
 *   x = 200 µT → 0.700
 *   x = 800 µT → 0.881
 *   x = 1 579 µT → 0.974
 *
 * tanh(1.5x) komprimerer ytterligere mot 1.0 for å beskytte mot enkeltspikes.
 */
export function magToControl(devUT: number): number {
  const v = Math.log10(1 + Math.max(0, devUT)) / LOG_DENOMINATOR;
  return Math.tanh(1.5 * v);
}

/**
 * Barometer-delta (meter) → pitch-offset i Hz for carrier.
 *
 * Observert peak ±3 m/sample fra T-bane og heis. Klippes ved ±1.5 m for å
 * holde pitch-modulasjonen innenfor musikalsk område. Mappes til ±2 Hz
 * (~3.4 % av 58 Hz, omtrent én kvartonenes intervall).
 */
export function baroDeltaToPitchHz(dalt: number): number {
  const clipped = Math.max(-1.5, Math.min(1.5, dalt));
  return (clipped / 1.5) * 2;
}

/**
 * Mag-kontrollverdi (0..1) → bandpass-senterfrekvens for tekstur.
 *
 * Logaritmisk interpolering 250 → 3 500 Hz. Bassområde i ro,
 * høyfrekvent "rasling" når magnetfeltet er aktivt.
 */
export function magControlToBandpassHz(magCtl: number): number {
  const c = Math.max(0, Math.min(1, magCtl));
  const f0 = 250;
  const f1 = 3500;
  return f0 * Math.pow(f1 / f0, c);
}

/**
 * Hastighet i km/h → LFO-frekvens for Speed Pulse (Lag 0+).
 *
 * Lineær mapping: kmh × 0.008 Hz. Per spec (CURSOR.md linje 311–313):
 *   0 km/h  → 0 Hz   (ingen puls)
 *   30 km/h → 0.24 Hz (~4 s sykel — buss/trikk)
 *   70 km/h → 0.56 Hz (~1.8 s sykel — T-bane/tog)
 */
export function speedKmhToPulseLfoHz(kmh: number): number {
  return Math.max(0, kmh) * 0.008;
}

/**
 * Enkel eksponentiell smoothing for å glatte ut høyfrekvent støy
 * i kontrollverdier før de når audio-laget.
 */
export function smooth(
  prev: number,
  next: number,
  alpha: number
): number {
  return prev * (1 - alpha) + next * alpha;
}
