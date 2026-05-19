/**
 * Lag 3 — NST (Number Station) tilleggsdel.
 *
 * Tidsbaserte, ikke-sensortriggede sinussekvenser med radio-karakter.
 * Estetisk referanse: shortwave number stations. CURSOR.md linje
 * 359–377.
 *
 * Lyddesign:
 *   • 4 forhåndsdefinerte sekvenser (semitoner fra A4 = 440 Hz)
 *   • Tone-spacing: 420 ms
 *   • Tone-varighet: 160–240 ms (tilfeldig per tone)
 *   • Bandpass 1200 Hz, Q 0.8 (skiller seg fra øvrige bandpass-lag)
 *   • Stereo-panning: tilfeldig –0.3 til +0.3 per sekvens (ikke per tone)
 *   • Volum: –34 dB ≈ 0.020 linear
 *
 * Constraints (CURSOR.md punkt 3 + 6):
 *   • NST-sekvenser avbrytes aldri av sensor-events — separat scheduling.
 *   • Stemme avbryter ikke pågående NST.
 *
 * Per-tone envelope:
 *   attack  5 ms     (rask onset, radio-karakter)
 *   sustain (duration - 35 ms)
 *   release 30 ms
 *
 * Implementasjon: persistent bandpass + panner + output gain. Per tone
 * lages midlertidig osc + envelope-gain, kobles inn i bandpass, og
 * stopper når noden er ferdig. Panner.pan ramps på sekvens-start.
 */

import {
  AudioContext,
  BiquadFilterNode,
  GainNode,
  StereoPannerNode,
} from 'react-native-audio-api';

const A4_FREQ = 440;
const BANDPASS_HZ = 1200;
const BANDPASS_Q = 0.8;
const NST_GAIN = 0.020; // -34 dB
const TONE_SPACING_SEC = 0.42;
const TONE_DURATION_MIN_SEC = 0.16;
const TONE_DURATION_MAX_SEC = 0.24;
const ATTACK_SEC = 0.005;
const RELEASE_SEC = 0.03;
const PAN_RAMP_SEC = 0.1;
const NEAR_ZERO = 0.0001;

const SEQUENCES: number[][] = [
  [0, -5, -12, -7],
  [0, 3, 7, 5],
  [-12, -5, 0, -3],
  [0, -2, -5, -9, -12],
];

export interface NstNode {
  output: GainNode;
  /**
   * Spiller en tilfeldig sekvens. Returnerer total varighet i sekunder
   * (slik at scheduleren kan reservere tid før neste sekvens).
   */
  playRandomSequence(): number;
  dispose(): void;
}

function semitoneToHz(semi: number): number {
  return A4_FREQ * Math.pow(2, semi / 12);
}

function pickRandomSequence(): number[] {
  return SEQUENCES[Math.floor(Math.random() * SEQUENCES.length)];
}

function randomPan(): number {
  // Symmetrisk ±0.3
  return (Math.random() * 2 - 1) * 0.3;
}

function randomToneDuration(): number {
  return (
    TONE_DURATION_MIN_SEC +
    Math.random() * (TONE_DURATION_MAX_SEC - TONE_DURATION_MIN_SEC)
  );
}

export function createNst(ctx: AudioContext): NstNode {
  const output = ctx.createGain();
  output.gain.value = NST_GAIN;

  const panner: StereoPannerNode = ctx.createStereoPanner();
  panner.pan.value = 0;
  panner.connect(output);

  const bandpass: BiquadFilterNode = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = BANDPASS_HZ;
  bandpass.Q.value = BANDPASS_Q;
  bandpass.connect(panner);

  function scheduleTone(freq: number, atTime: number): void {
    const dur = randomToneDuration();
    const env = ctx.createGain();
    env.gain.value = 0;
    env.connect(bandpass);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(env);

    env.gain.setValueAtTime(NEAR_ZERO, atTime);
    env.gain.exponentialRampToValueAtTime(1.0, atTime + ATTACK_SEC);
    env.gain.setValueAtTime(1.0, atTime + dur - RELEASE_SEC);
    env.gain.exponentialRampToValueAtTime(NEAR_ZERO, atTime + dur);
    env.gain.linearRampToValueAtTime(0, atTime + dur + 0.005);

    osc.start(atTime);
    osc.stop(atTime + dur + 0.015);
  }

  function playRandomSequence(): number {
    const seq = pickRandomSequence();
    const t0 = ctx.currentTime;
    const pan = randomPan();

    panner.pan.cancelScheduledValues(t0);
    panner.pan.setValueAtTime(panner.pan.value, t0);
    panner.pan.linearRampToValueAtTime(pan, t0 + PAN_RAMP_SEC);

    for (let i = 0; i < seq.length; i++) {
      const freq = semitoneToHz(seq[i]);
      const at = t0 + i * TONE_SPACING_SEC;
      scheduleTone(freq, at);
    }

    return (seq.length - 1) * TONE_SPACING_SEC + TONE_DURATION_MAX_SEC;
  }

  function dispose(): void {
    try {
      bandpass.disconnect();
      panner.disconnect();
      output.disconnect();
    } catch {
      // Allerede koblet fra
    }
  }

  return { output, playRandomSequence, dispose };
}
