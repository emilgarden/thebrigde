/**
 * In-memory eventlogg.
 *
 * Lagrer de N siste BAM-hendelsene som scheduler har fyrt. Brukes av
 * UI til å vise en kompakt logg-strip og av framtidige analyser
 * (kunngjørings-kø, NST-debounce-logikk osv).
 *
 * Loggen er bevisst flyktig: ingen persistens, ingen filskriving.
 * Recorder-modulen tar fortsatt seg av session-opptak av rå sensor-
 * data — eventloggen er kun en derivat av schedulerens output.
 */

import type { FiredEvent } from '../audio/eventScheduler';

const MAX_ENTRIES = 50;

let entries: FiredEvent[] = [];
const listeners = new Set<(es: FiredEvent[]) => void>();

function emit(): void {
  for (const l of listeners) l(entries);
}

export function record(e: FiredEvent): void {
  entries = [e, ...entries].slice(0, MAX_ENTRIES);
  emit();
}

export function getEntries(): FiredEvent[] {
  return entries;
}

export function subscribe(
  listener: (es: FiredEvent[]) => void
): () => void {
  listeners.add(listener);
  listener(entries);
  return () => {
    listeners.delete(listener);
  };
}

export function clear(): void {
  entries = [];
  emit();
}
