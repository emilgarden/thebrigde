/**
 * Lag 2 — Tekstur.
 *
 * Rosa støy (Paul Kellet's algoritme) gjennom bandpass-filter.
 * Gir et lavt, ufokusert "værhus"-bakteppe.
 *
 * Iter 3:
 *   • setBandpassFreq(hz) styres av log(mag_deviation) — gjør tekstur
 *     mørk i ro, lys og rasende ved magnetisk aktivitet.
 *   • setOutputGain(linear) styres av fase-detektoren — idle 0.5×,
 *     active 1.0× — gir tekstur et tydelig "wake up" når bruker
 *     beveger seg.
 */

import {
  AudioContext,
  AudioBuffer,
  AudioBufferSourceNode,
  GainNode,
} from 'react-native-audio-api';

const TEXTURE_GAIN_BASE = 0.0056; // -45 dB
const BANDPASS_FREQ_INITIAL = 400;
// Spec sier Q=1.7, men i støyete mag-miljø (f.eks. ved PC) ringer
// filteret hørbart ved raske sweeps. 1.0 gir mer luft og toleranse
// uten å miste tekstur-karakteren — kan justeres tilbake mot 1.4 om
// klangen blir for diffus etter en lengre lyttetest.
const BANDPASS_Q = 1.0;
const NOISE_DURATION_SEC = 4.0;
// Senket fra 0.4s for å gi engine-smoothingen mer tid til å dempe
// rester av mag-spikes før de når filteret. Trade-off: tekstur
// reagerer litt tregere på reelle mag-endringer (T-bane-overgang etc).
const FREQ_RAMP_SEC = 1.0;
const GAIN_RAMP_SEC = 1.5;

export interface TextureNode {
  output: GainNode;
  setBandpassFreq(hz: number): void;
  setOutputGain(linear: number): void;
  dispose(): void;
}

function createPinkNoiseBuffer(
  ctx: AudioContext,
  durationSec: number
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Paul Kellet's pink noise filter
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

export function createTexture(ctx: AudioContext): TextureNode {
  const output = ctx.createGain();
  output.gain.value = TEXTURE_GAIN_BASE;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = BANDPASS_FREQ_INITIAL;
  bandpass.Q.value = BANDPASS_Q;
  bandpass.connect(output);

  const noise: AudioBufferSourceNode = ctx.createBufferSource();
  noise.buffer = createPinkNoiseBuffer(ctx, NOISE_DURATION_SEC);
  noise.loop = true;
  noise.connect(bandpass);

  noise.start(ctx.currentTime);

  return {
    output,
    setBandpassFreq(hz: number): void {
      const f = Math.max(50, Math.min(8000, hz));
      const t = ctx.currentTime;
      bandpass.frequency.cancelScheduledValues(t);
      bandpass.frequency.setValueAtTime(bandpass.frequency.value, t);
      bandpass.frequency.linearRampToValueAtTime(f, t + FREQ_RAMP_SEC);
    },
    setOutputGain(linear: number): void {
      const g = Math.max(0, Math.min(2, linear)) * TEXTURE_GAIN_BASE;
      const t = ctx.currentTime;
      output.gain.cancelScheduledValues(t);
      output.gain.setValueAtTime(output.gain.value, t);
      output.gain.linearRampToValueAtTime(g, t + GAIN_RAMP_SEC);
    },
    dispose(): void {
      try {
        noise.stop();
      } catch {
        // Allerede stoppet
      }
    },
  };
}
