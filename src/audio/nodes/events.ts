/**
 * Lag 3 — Hendelser (BAM-pinger).
 *
 * Felles ping-motor brukt av `eventScheduler.ts` til å fyre
 * ALARM/WARNING-mønstre. Designet er per CURSOR.md linje 201–217:
 *
 *   Envelope (felles for alle ping-typer):
 *     attack  0.006 s   (rask onset)
 *     decay   0.28  s   (eksponentiell fade)
 *     release 0.06  s   (utklang)
 *
 *   Bandpass: 800–2400 Hz, Q 0.7  → "radiokarakter"
 *   Alarm:   880 Hz sinustone, peak gain -18 dB ≈ 0.126
 *   Warning: 660 Hz sinustone, peak gain -24 dB ≈ 0.063
 *
 * Glissando-varianten (`scheduleGlissando`) brukes etter baro-warning:
 * sinustone som glir fra startHz til endHz over 1.5 s, samme envelope-
 * form men forlenget decay slik at glidet er hørbart.
 *
 * Hver ping/gliss oppretter midlertidige oscillator + envelope-gain-noder
 * som kobles via en delt bandpass og output-gain. Etter oscillator.stop()
 * blir nodene garbage-collected.
 *
 * Lag 3-output har sin egen `output` GainNode slik at engine kan koble
 * den til master parallelt med øvrige lag.
 */

import {
  AudioContext,
  BiquadFilterNode,
  GainNode,
} from 'react-native-audio-api';

const BANDPASS_CENTER_HZ = 1400; // sentert i 800–2400 Hz-båndet
const BANDPASS_Q = 0.7;

const ATTACK_SEC = 0.006;
const DECAY_SEC = 0.28;
const RELEASE_SEC = 0.06;
const NEAR_ZERO = 0.0001; // exponentialRamp tåler ikke 0 — bruk lav floor

const ALARM_FREQ_HZ = 880;
const WARNING_FREQ_HZ = 660;

// Peak linear gains målt fra -18/-24 dB (per spec).
// 10^(dB/20):
const ALARM_PEAK = 0.126;
const WARNING_PEAK = 0.0631;

const GLISS_DURATION_SEC = 1.5;
const GLISS_DECAY_TAIL_SEC = 0.4; // utklang etter at glidet er fullført

export type PingKind = 'alarm' | 'warning';

export interface EventsNode {
  output: GainNode;
  /** Spiller én enkelt ping av gitt type ved gitt audio-tidspunkt. */
  schedulePing(kind: PingKind, atTime: number): void;
  /**
   * Spiller et glissando: sinustone fra startHz til endHz over
   * GLISS_DURATION_SEC. Samme envelope-prinsipp som ping men forlenget.
   */
  scheduleGlissando(startHz: number, endHz: number, atTime: number): void;
  dispose(): void;
}

export function createEvents(ctx: AudioContext): EventsNode {
  const output = ctx.createGain();
  output.gain.value = 1.0;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = BANDPASS_CENTER_HZ;
  bandpass.Q.value = BANDPASS_Q;
  bandpass.connect(output);

  function pingPeakFor(kind: PingKind): number {
    return kind === 'alarm' ? ALARM_PEAK : WARNING_PEAK;
  }

  function pingFreqFor(kind: PingKind): number {
    return kind === 'alarm' ? ALARM_FREQ_HZ : WARNING_FREQ_HZ;
  }

  function schedulePing(kind: PingKind, atTime: number): void {
    const peak = pingPeakFor(kind);
    const freq = pingFreqFor(kind);

    const env = ctx.createGain();
    env.gain.value = 0;
    env.connect(bandpass);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(env);

    env.gain.setValueAtTime(NEAR_ZERO, atTime);
    env.gain.exponentialRampToValueAtTime(peak, atTime + ATTACK_SEC);
    env.gain.exponentialRampToValueAtTime(
      NEAR_ZERO,
      atTime + ATTACK_SEC + DECAY_SEC
    );
    env.gain.linearRampToValueAtTime(
      0,
      atTime + ATTACK_SEC + DECAY_SEC + RELEASE_SEC
    );

    osc.start(atTime);
    osc.stop(atTime + ATTACK_SEC + DECAY_SEC + RELEASE_SEC + 0.01);
  }

  function scheduleGlissando(
    startHz: number,
    endHz: number,
    atTime: number
  ): void {
    const peak = WARNING_PEAK; // gliss brukes etter warning-ping
    const env = ctx.createGain();
    env.gain.value = 0;
    env.connect(bandpass);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = startHz;
    osc.connect(env);

    // Frekvens-glide gjennom hele varigheten
    osc.frequency.setValueAtTime(startHz, atTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(NEAR_ZERO, endHz),
      atTime + GLISS_DURATION_SEC
    );

    // Envelope: rask attack, hold gjennom glidet, deretter utklang
    env.gain.setValueAtTime(NEAR_ZERO, atTime);
    env.gain.exponentialRampToValueAtTime(peak, atTime + ATTACK_SEC);
    env.gain.setValueAtTime(peak, atTime + GLISS_DURATION_SEC);
    env.gain.exponentialRampToValueAtTime(
      NEAR_ZERO,
      atTime + GLISS_DURATION_SEC + GLISS_DECAY_TAIL_SEC
    );
    env.gain.linearRampToValueAtTime(
      0,
      atTime + GLISS_DURATION_SEC + GLISS_DECAY_TAIL_SEC + RELEASE_SEC
    );

    osc.start(atTime);
    osc.stop(
      atTime + GLISS_DURATION_SEC + GLISS_DECAY_TAIL_SEC + RELEASE_SEC + 0.01
    );
  }

  return {
    output,
    schedulePing,
    scheduleGlissando,
    dispose(): void {
      try {
        bandpass.disconnect();
        output.disconnect();
      } catch {
        // Allerede koblet fra
      }
    },
  };
}
