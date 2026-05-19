/**
 * Lag 0 — Carrier.
 *
 * Sinusoscillator 58 Hz, gulvtone som alltid er aktiv mens lyd kjører.
 * Svak tremolo (LFO på gain) gir en organisk underliggende puls.
 *
 * Iter 3: setPitchOffset(hz) lar engine modulere frekvens basert på
 * barometer-delta. Endringer ramps med linearRampToValueAtTime for å
 * unngå klikk.
 */

import { AudioContext, GainNode } from 'react-native-audio-api';
import {
  RampState,
  commitRamp,
  currentRampValue,
  makeRamp,
} from '../ramp';

const CARRIER_FREQ = 58;
const CARRIER_GAIN = 0.0224; // -33 dB per spec
const TREMOLO_FREQ = 0.045;
const TREMOLO_DEPTH = 0.18;
const PITCH_RAMP_SEC = 0.5;

export interface CarrierNode {
  output: GainNode;
  setPitchOffset(hz: number): void;
  dispose(): void;
}

export function createCarrier(ctx: AudioContext): CarrierNode {
  const output = ctx.createGain();
  output.gain.value = CARRIER_GAIN;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = CARRIER_FREQ;
  osc.connect(output);

  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = CARRIER_GAIN * TREMOLO_DEPTH;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = TREMOLO_FREQ;
  lfo.connect(lfoDepth);
  lfoDepth.connect(output.gain);

  const now = ctx.currentTime;
  osc.start(now);
  lfo.start(now);

  const freqRamp: RampState = makeRamp(CARRIER_FREQ);

  return {
    output,
    setPitchOffset(hz: number): void {
      const t = ctx.currentTime;
      const target = CARRIER_FREQ + hz;
      const current = currentRampValue(freqRamp, t);
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.setValueAtTime(current, t);
      osc.frequency.linearRampToValueAtTime(target, t + PITCH_RAMP_SEC);
      commitRamp(freqRamp, t, t + PITCH_RAMP_SEC, current, target);
    },
    dispose(): void {
      try {
        osc.stop();
        lfo.stop();
      } catch {
        // Allerede stoppet
      }
    },
  };
}
