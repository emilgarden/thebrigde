/**
 * BAM-pattern scheduler — orkestrerer hvordan en `EventsNode` spiller
 * av varslingsmønstre.
 *
 * Per IMO BAM-hierarki (CURSOR.md linje 173–183):
 *   ALARM   — 3 korte signaler, gjentatt hvert 7–10 s
 *   WARNING — 2 korte signaler (gjentakelse styres av trigger-laget)
 *
 * Inter-ping pause: 220 ms (CURSOR.md linje 216).
 * Inter-repeat pause for ALARM: 8 s konstant (innenfor 7–10 s-vinduet).
 *
 * Scheduler er bevisst dum: den vet ikke hva som trigget en hendelse,
 * kun hvilket mønster som skal spilles og hvilken etikett som hører til.
 * Debounce og prioriteringsbeslutninger ligger i `eventTriggers.ts`.
 *
 * Scheduler eier også debounce-state per trigger-nøkkel slik at samme
 * trigger ikke kan fyre på nytt før debounce-vinduet er ute. Trigger-
 * laget kaller `tryFire(key, opts)` — scheduler avgjør om det går.
 */

import type { EventsNode } from './nodes/events';

const INTER_PING_SEC = 0.22;
const ALARM_INTER_REPEAT_SEC = 8.0;

export type Severity = 'alarm' | 'warning';

export interface FireOptions {
  /** Stabil nøkkel for debounce-bokføring (f.eks. "mag-alarm"). */
  key: string;
  /** Debounce-vindu i sekunder. */
  debounceSec: number;
  /** Hvilken BAM-severitet — bestemmer ping-type og repetisjon. */
  severity: Severity;
  /** Logg-melding som skal vises i UI/state. */
  message: string;
  /**
   * Valgfri glissando som spilles etter siste ping (kun warning).
   * Brukes av baro-trigger til å indikere retning (opp/ned).
   */
  glissando?: { startHz: number; endHz: number };
}

export interface FiredEvent {
  key: string;
  severity: Severity;
  message: string;
  timestampMs: number;
}

export type FiredListener = (e: FiredEvent) => void;

export interface EventScheduler {
  /**
   * Prøver å fyre et mønster. Returnerer true hvis fyrt, false hvis
   * blokkert av debounce.
   */
  tryFire(opts: FireOptions): boolean;
  subscribe(listener: FiredListener): () => void;
  reset(): void;
}

/**
 * Tidskilde — separert ut slik at tester kan injisere klokken.
 * I produksjon: ctx.currentTime for audio-scheduling, Date.now() for
 * debounce og UI-tidsstempler.
 */
export interface ClockSource {
  audioNow(): number;
  wallNow(): number;
}

export function defaultClock(
  ctx: { currentTime: number }
): ClockSource {
  return {
    audioNow: () => ctx.currentTime,
    wallNow: () => Date.now(),
  };
}

export function createEventScheduler(
  events: EventsNode,
  clock: ClockSource
): EventScheduler {
  const lastFiredMs = new Map<string, number>();
  const listeners = new Set<FiredListener>();

  function emit(e: FiredEvent): void {
    for (const l of listeners) l(e);
  }

  function playPattern(opts: FireOptions): void {
    const t0 = clock.audioNow();
    if (opts.severity === 'alarm') {
      // 3 pings × 2 repetisjoner, 8 s mellom repetisjonene.
      for (let rep = 0; rep < 2; rep++) {
        const base = t0 + rep * ALARM_INTER_REPEAT_SEC;
        events.schedulePing('alarm', base);
        events.schedulePing('alarm', base + INTER_PING_SEC);
        events.schedulePing('alarm', base + 2 * INTER_PING_SEC);
      }
      return;
    }

    // warning: 2 pings, evt. glissando etter siste
    events.schedulePing('warning', t0);
    events.schedulePing('warning', t0 + INTER_PING_SEC);
    if (opts.glissando) {
      // Start glissando 0.5 s etter siste ping slik at den ikke
      // overlapper med ping-decay-halen.
      const glissAt = t0 + INTER_PING_SEC + 0.5;
      events.scheduleGlissando(
        opts.glissando.startHz,
        opts.glissando.endHz,
        glissAt
      );
    }
  }

  function tryFire(opts: FireOptions): boolean {
    const now = clock.wallNow();
    const last = lastFiredMs.get(opts.key) ?? 0;
    if (now - last < opts.debounceSec * 1000) return false;
    lastFiredMs.set(opts.key, now);
    playPattern(opts);
    emit({
      key: opts.key,
      severity: opts.severity,
      message: opts.message,
      timestampMs: now,
    });
    return true;
  }

  function subscribe(listener: FiredListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function reset(): void {
    lastFiredMs.clear();
  }

  return { tryFire, subscribe, reset };
}
