/**
 * Event-triggers — leser `FusedState` og avgjør når BAM-mønstre fyres.
 *
 * Iter 4 dekker tre sensorbaserte triggere (CURSOR.md linje 187–199):
 *
 *   MAG ALARM     deviation > 40 µT     debounce 14 s
 *   MAG WARNING   deviation 15–40 µT    debounce  8 s
 *   BARO WARNING  |altitudeDelta| > 1.5 m sustained 3 s, debounce 12 s
 *                 → 2 pings + glissando opp (stigning) eller ned (fall)
 *
 * Orbital, luftfart, Kp og NST-trigging kommer i senere itererasjoner.
 *
 * Ingen scheduling-logikk her — vi kaller `scheduler.tryFire(...)` som
 * eier debounce og selve patternet. Mag-triggeren passer på at ikke
 * ALARM og WARNING fyres for samme spike (alarm wins, warning skips).
 *
 * Baro sustained-detector holder en kort timeline av siste verdier og
 * fyrer kun når terskelen har vært overskredet kontinuerlig i 3 s.
 * Det forhindrer at en enkelt rampebanke utløser flere triggere.
 */

import type { FusedState } from '../sensors/types';
import type { EventScheduler } from './eventScheduler';

const MAG_ALARM_THRESHOLD = 40;
const MAG_WARNING_THRESHOLD = 15;
const MAG_ALARM_DEBOUNCE_SEC = 14;
const MAG_WARNING_DEBOUNCE_SEC = 8;

const BARO_THRESHOLD_M = 1.5;
const BARO_SUSTAIN_MS = 3_000;
const BARO_DEBOUNCE_SEC = 12;
const BARO_GLISS_RISE_START = 700;
const BARO_GLISS_RISE_END = 900;
const BARO_GLISS_FALL_START = 700;
const BARO_GLISS_FALL_END = 520;

export interface EventTriggers {
  /** Kalles fra modulasjonsløkken hver tikk. */
  evaluate(state: FusedState, nowMs?: number): void;
  reset(): void;
}

export function createEventTriggers(
  scheduler: EventScheduler
): EventTriggers {
  // Sustain-detektor for baro: tidspunkt da overskridelse startet,
  // og retning (positiv = stigning).
  let baroSustainStartMs: number | null = null;
  let baroSustainDirection: 1 | -1 = 1;

  function evaluateMag(state: FusedState): void {
    if (state.calibrating || state.magBaseline === null) return;
    const dev = state.magDeviation;
    if (dev >= MAG_ALARM_THRESHOLD) {
      scheduler.tryFire({
        key: 'mag-alarm',
        debounceSec: MAG_ALARM_DEBOUNCE_SEC,
        severity: 'alarm',
        message: `MAG ANOMALY +${dev.toFixed(0)}µT`,
      });
      return;
    }
    if (dev >= MAG_WARNING_THRESHOLD) {
      scheduler.tryFire({
        key: 'mag-warning',
        debounceSec: MAG_WARNING_DEBOUNCE_SEC,
        severity: 'warning',
        message: `MAG ACTIVITY +${dev.toFixed(0)}µT`,
      });
    }
  }

  function evaluateBaro(state: FusedState, nowMs: number): void {
    const d = state.altitudeDelta;
    const absD = Math.abs(d);
    const overThreshold = absD >= BARO_THRESHOLD_M;
    const direction: 1 | -1 = d >= 0 ? 1 : -1;

    if (!overThreshold) {
      baroSustainStartMs = null;
      return;
    }

    // Reset starttidspunktet hvis retningen har snudd
    if (
      baroSustainStartMs === null ||
      baroSustainDirection !== direction
    ) {
      baroSustainStartMs = nowMs;
      baroSustainDirection = direction;
      return;
    }

    if (nowMs - baroSustainStartMs < BARO_SUSTAIN_MS) return;

    const rising = direction === 1;
    const fired = scheduler.tryFire({
      key: 'baro-warning',
      debounceSec: BARO_DEBOUNCE_SEC,
      severity: 'warning',
      message: `FLOOR CHANGE ${rising ? '+' : ''}${d.toFixed(1)}m`,
      glissando: rising
        ? { startHz: BARO_GLISS_RISE_START, endHz: BARO_GLISS_RISE_END }
        : { startHz: BARO_GLISS_FALL_START, endHz: BARO_GLISS_FALL_END },
    });

    // Etter at vi har fyrt (eller blitt blokkert av debounce), kreves
    // ny sustain-periode før neste trigger.
    if (fired) baroSustainStartMs = nowMs;
  }

  function evaluate(state: FusedState, nowMs: number = Date.now()): void {
    evaluateMag(state);
    evaluateBaro(state, nowMs);
  }

  function reset(): void {
    baroSustainStartMs = null;
    baroSustainDirection = 1;
  }

  return { evaluate, reset };
}
