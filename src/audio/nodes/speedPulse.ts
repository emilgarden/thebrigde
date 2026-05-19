/**
 * Lag 0+ — Speed Pulse.
 *
 * Egen audio-komponent som gjør fart hørbar. 50 Hz sub-sinus modulert
 * av en LFO hvis frekvens skalerer lineært med km/h. Pulsraten er
 * informasjonsbæreren — den underliggende tonens frekvens og volum
 * er konstant.
 *
 * Aktiveres når GPS gir gyldig fix og speedKmh > 0. Fader ut over 8 s
 * ved tap av fix eller når farten treffer 0 (typisk når akselerometer
 * overstyrer frosset GPS-verdi). Fader inn over 4 s når fart returnerer.
 *
 * Spec: docs/CURSOR.md linje 296–314.
 *
 * Signal-flyt:
 *   subOsc(50 Hz) → modGain ──→ output ──→ master
 *                       ▲
 *   lfo(kmh*0.008 Hz) → lfoDepth ┘
 *
 *   modGain.gain.value = BASE_GAIN  (konstant)
 *   lfoDepth.gain.value = BASE_GAIN * PULSE_DEPTH
 *   → modGain.gain svinger ± BASE_GAIN*DEPTH rundt BASE_GAIN
 *   output.gain = on/off-envelope (0 eller 1.0) med 4 s ramp inn / 8 s ramp ut
 *
 * Med DEPTH = 0.7 svinger signal-amplituden mellom
 *   BASE_GAIN * 0.3 = -60.4 dB (svakeste punkt)
 *   BASE_GAIN * 1.7 = -45.4 dB (sterkeste punkt)
 * — tonen blir aldri helt stille, men har et tydelig "pust".
 */

import { AudioContext, GainNode } from 'react-native-audio-api';
import { speedKmhToPulseLfoHz } from '../modulation';
import {
  RampState,
  commitRamp,
  currentRampValue,
  makeRamp,
} from '../ramp';

const SUB_FREQ = 50;
const BASE_GAIN = 0.00316; // -50 dB per spec
const PULSE_DEPTH = 0.7;
const RAMP_IN_SEC = 4;
const RAMP_OUT_SEC = 8;
const LFO_FREQ_RAMP_SEC = 1;

export interface SpeedPulseNode {
  output: GainNode;
  setSpeed(kmh: number, hasFix: boolean): void;
  dispose(): void;
}

export function createSpeedPulse(ctx: AudioContext): SpeedPulseNode {
  const output = ctx.createGain();
  output.gain.value = 0;

  const modGain = ctx.createGain();
  modGain.gain.value = BASE_GAIN;
  modGain.connect(output);

  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.value = SUB_FREQ;
  subOsc.connect(modGain);

  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = BASE_GAIN * PULSE_DEPTH;
  lfoDepth.connect(modGain.gain);

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0;
  lfo.connect(lfoDepth);

  const now = ctx.currentTime;
  subOsc.start(now);
  lfo.start(now);

  const gainRamp: RampState = makeRamp(0);
  const lfoFreqRamp: RampState = makeRamp(0);

  return {
    output,
    setSpeed(kmh: number, hasFix: boolean): void {
      const t = ctx.currentTime;
      const active = hasFix && kmh > 0;

      const targetGain = active ? 1.0 : 0;
      const rampSec = active ? RAMP_IN_SEC : RAMP_OUT_SEC;
      const currentGain = currentRampValue(gainRamp, t);
      output.gain.cancelScheduledValues(t);
      output.gain.setValueAtTime(currentGain, t);
      output.gain.linearRampToValueAtTime(targetGain, t + rampSec);
      commitRamp(gainRamp, t, t + rampSec, currentGain, targetGain);

      if (active) {
        const targetLfo = speedKmhToPulseLfoHz(kmh);
        const currentLfo = currentRampValue(lfoFreqRamp, t);
        lfo.frequency.cancelScheduledValues(t);
        lfo.frequency.setValueAtTime(currentLfo, t);
        lfo.frequency.linearRampToValueAtTime(
          targetLfo,
          t + LFO_FREQ_RAMP_SEC
        );
        commitRamp(
          lfoFreqRamp,
          t,
          t + LFO_FREQ_RAMP_SEC,
          currentLfo,
          targetLfo
        );
      }
    },
    dispose(): void {
      try {
        subOsc.stop();
        lfo.stop();
      } catch {
        // Allerede stoppet
      }
    },
  };
}
