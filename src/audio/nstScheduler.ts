/**
 * NST-scheduler — løs timer som fyrer en tilfeldig NST-sekvens
 * hvert 22–50. sekund (tilfeldig per intervall, per CURSOR.md
 * linje 361).
 *
 * Hver sekvens er kort (~2 s), så vi reserverer kun tid for det aktuelle
 * mønsteret i tillegg til min-pausen. Scheduler eier ingen audio-state
 * selv — den kaller `nst.playRandomSequence()` og setter neste timer.
 *
 * Bevisst dum: ingen prioritering, ingen kø, ingen interaksjon med
 * BAM-events (per spec — NST avbrytes aldri av sensor-events).
 */

import type { NstNode } from './nodes/nst';

const MIN_INTERVAL_SEC = 22;
const MAX_INTERVAL_SEC = 50;

function randomIntervalMs(): number {
  const sec =
    MIN_INTERVAL_SEC + Math.random() * (MAX_INTERVAL_SEC - MIN_INTERVAL_SEC);
  return sec * 1000;
}

export interface NstScheduler {
  start(): void;
  stop(): void;
}

export function createNstScheduler(nst: NstNode): NstScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  function scheduleNext(): void {
    if (!running) return;
    timer = setTimeout(() => {
      if (!running) return;
      try {
        nst.playRandomSequence();
      } catch {
        // Hvis audio-context er stengt mellom scheduleNext og fire,
        // svelger vi unntaket og stopper løkken.
        running = false;
        return;
      }
      scheduleNext();
    }, randomIntervalMs());
  }

  function start(): void {
    if (running) return;
    running = true;
    scheduleNext();
  }

  function stop(): void {
    running = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { start, stop };
}
