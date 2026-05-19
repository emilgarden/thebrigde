/**
 * Fase-detektor — binær tilstand "idle" / "active" med hysterese.
 *
 * Iter 3 nivå B: kun bevegelse-vs-ro. Mer detaljerte faser (heis, T-bane,
 * gange, stillesittende) kommer i Iter 4.
 *
 * Terskler er basert på empiriske data fra opptak 2026-05-19:
 *   • motion_i > 0.30 i 3 sek → 'active'
 *   • motion_i < 0.12 i 5 sek → 'idle'
 *   • Dvale-tiden er lengre for tilbake-til-idle for å unngå at korte
 *     pauser under gange (f.eks. ved kryssing) feilaktig vipper tilstanden.
 *
 * Detektoren kjører på en intern eksponentielt-smoothet motion_i (α=0.15
 * over 5 Hz oppdatering = ~0.85s halveringstid). Det fjerner korte spikes
 * fra heisvibrasjoner og pustebevegelser som ellers ville feilaktig holdt
 * tilstanden på 'active'.
 */

export type Phase = 'idle' | 'active';

const ACTIVE_THRESHOLD = 0.30;
const IDLE_THRESHOLD = 0.12;
const ACTIVE_DWELL_MS = 3_000;
const IDLE_DWELL_MS = 5_000;
const SMOOTH_ALPHA = 0.15;

let currentPhase: Phase = 'idle';
let candidateSinceMs: number | null = null;
let smoothedMotion = 0;

const listeners = new Set<(p: Phase) => void>();

function emit(): void {
  for (const l of listeners) l(currentPhase);
}

export function subscribe(cb: (p: Phase) => void): () => void {
  listeners.add(cb);
  cb(currentPhase);
  return () => {
    listeners.delete(cb);
  };
}

export function getPhase(): Phase {
  return currentPhase;
}

export function update(motionI: number, nowMs: number = Date.now()): Phase {
  smoothedMotion = smoothedMotion * (1 - SMOOTH_ALPHA) + motionI * SMOOTH_ALPHA;
  const wantsActive = smoothedMotion > ACTIVE_THRESHOLD;
  const wantsIdle = smoothedMotion < IDLE_THRESHOLD;

  if (currentPhase === 'idle') {
    if (wantsActive) {
      if (candidateSinceMs === null) {
        candidateSinceMs = nowMs;
      } else if (nowMs - candidateSinceMs >= ACTIVE_DWELL_MS) {
        currentPhase = 'active';
        candidateSinceMs = null;
        emit();
      }
    } else {
      candidateSinceMs = null;
    }
  } else {
    if (wantsIdle) {
      if (candidateSinceMs === null) {
        candidateSinceMs = nowMs;
      } else if (nowMs - candidateSinceMs >= IDLE_DWELL_MS) {
        currentPhase = 'idle';
        candidateSinceMs = null;
        emit();
      }
    } else {
      candidateSinceMs = null;
    }
  }

  return currentPhase;
}

export function reset(): void {
  currentPhase = 'idle';
  candidateSinceMs = null;
  smoothedMotion = 0;
  emit();
}

export function getSmoothedMotion(): number {
  return smoothedMotion;
}
