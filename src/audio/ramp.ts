/**
 * Linear-ramp tracker for AudioParam.
 *
 * `cancelScheduledValues + setValueAtTime + linearRampToValueAtTime`
 * krever en pålitelig "current value" som startpunkt. I noen versjoner
 * av react-native-audio-api (0.12.x) returnerer `AudioParam.value` ikke
 * den interpolerte nåverdien under en pågående ramp, som gir hørbar
 * knitring når engine-løkken oppdaterer parametre hver 200 ms.
 *
 * Denne modulen sporer rampen JS-side via lineær interpolasjon mellom
 * kjent start/slutt, og er sannhetskilden for "nåverdi". Bruk
 * `currentRampValue()` før hver re-ramp, og `commit()` etterpå.
 */

export interface RampState {
  startTime: number;
  endTime: number;
  startValue: number;
  endValue: number;
}

export function makeRamp(initial: number): RampState {
  return {
    startTime: 0,
    endTime: 0,
    startValue: initial,
    endValue: initial,
  };
}

export function currentRampValue(r: RampState, now: number): number {
  if (r.endTime <= r.startTime || now >= r.endTime) return r.endValue;
  if (now <= r.startTime) return r.startValue;
  const t = (now - r.startTime) / (r.endTime - r.startTime);
  return r.startValue + (r.endValue - r.startValue) * t;
}

export function commitRamp(
  r: RampState,
  startTime: number,
  endTime: number,
  startValue: number,
  endValue: number
): void {
  r.startTime = startTime;
  r.endTime = endTime;
  r.startValue = startValue;
  r.endValue = endValue;
}
