/**
 * Lag 1 — Atmosfære.
 *
 * To sinusoscillatorer (D4 + A4) gjennom syntetisk reverb og lowpass.
 * Gir en lav, harmonisk drone som beskriver underliggende ro.
 *
 * setReverbWet(0..1) eksponert som API-en, men er per nå ikke koblet til
 * noen sensorinngang — atmosfæren ligger på INITIAL_WET=0.20. Bevegelse
 * (motion) skal ikke drive primær-lag (det er en åpenbar dimensjon).
 * API-en beholdes for fremtidig kobling til en mer egnet usynlig
 * dimensjon (vind, geomagnetisk Kp, e.l.). Komplementært dry-signal
 * synker når wet stiger slik at total amplitude holder seg konstant.
 */

import {
  AudioContext,
  AudioBuffer,
  GainNode,
} from 'react-native-audio-api';

const D4_FREQ = 294;
const A4_FREQ = 440;
// Spec sier –46/–50 dB ("nesten uhørbar"). Lyttetest 2026-05-19 viste
// at det er for stille i praksis — justert opp ~8 dB til mellomnivå
// der tonene er identifiserbare ved fokus men ellers ambient.
// Spec-bevarende forhold: D4 dominerer A4 med ~4 dB.
const D4_GAIN = 0.0126; // -38 dB
const A4_GAIN = 0.0079; // -42 dB
const LOWPASS_FREQ = 500;
const REVERB_DECAY_SEC = 4.0;
const INITIAL_WET = 0.20;
const WET_RAMP_SEC = 1.0;

export interface AtmosphereNode {
  output: GainNode;
  setReverbWet(wet: number): void;
  dispose(): void;
}

function createReverbImpulse(
  ctx: AudioContext,
  durationSec: number,
  decayFactor: number
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.pow(1 - t, decayFactor);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return buffer;
}

export function createAtmosphere(ctx: AudioContext): AtmosphereNode {
  const output = ctx.createGain();
  output.gain.value = 1.0;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = LOWPASS_FREQ;
  lowpass.Q.value = 0.7;
  lowpass.connect(output);

  const dryGain = ctx.createGain();
  dryGain.gain.value = 1.0 - INITIAL_WET;
  dryGain.connect(lowpass);

  const wetGain = ctx.createGain();
  wetGain.gain.value = INITIAL_WET;
  wetGain.connect(lowpass);

  const reverb = ctx.createConvolver();
  reverb.buffer = createReverbImpulse(ctx, REVERB_DECAY_SEC, 2.5);
  reverb.connect(wetGain);

  const mix = ctx.createGain();
  mix.gain.value = 1.0;
  mix.connect(dryGain);
  mix.connect(reverb);

  const d4 = ctx.createOscillator();
  d4.type = 'sine';
  d4.frequency.value = D4_FREQ;
  const d4Gain = ctx.createGain();
  d4Gain.gain.value = D4_GAIN;
  d4.connect(d4Gain);
  d4Gain.connect(mix);

  const a4 = ctx.createOscillator();
  a4.type = 'sine';
  a4.frequency.value = A4_FREQ;
  const a4Gain = ctx.createGain();
  a4Gain.gain.value = A4_GAIN;
  a4.connect(a4Gain);
  a4Gain.connect(mix);

  const now = ctx.currentTime;
  d4.start(now);
  a4.start(now);

  return {
    output,
    setReverbWet(wet: number): void {
      const w = Math.max(0, Math.min(1, wet));
      const t = ctx.currentTime;
      wetGain.gain.cancelScheduledValues(t);
      wetGain.gain.setValueAtTime(wetGain.gain.value, t);
      wetGain.gain.linearRampToValueAtTime(w, t + WET_RAMP_SEC);
      dryGain.gain.cancelScheduledValues(t);
      dryGain.gain.setValueAtTime(dryGain.gain.value, t);
      dryGain.gain.linearRampToValueAtTime(1 - w, t + WET_RAMP_SEC);
    },
    dispose(): void {
      try {
        d4.stop();
        a4.stop();
      } catch {
        // Allerede stoppet
      }
    },
  };
}
