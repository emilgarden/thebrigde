import type { VoiceChannel, VoiceProfile, VoiceSettings } from './types';

/** Delt ElevenLabs-konfig — brukes av scripts, aldri av appen direkte. */
export const BASE_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.85,
  similarity_boost: 0.40,
  style: 0.0,
  use_speaker_boost: false,
};

export const ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2';

/**
 * Tre kanaler — voiceId settes via scripts/voiceProfiles.json (ElevenLabs UI).
 * Appen leser kun voiceId fra bundled prod-cache metadata, ikke API.
 */
export const VOICE_PROFILES: Record<VoiceChannel, VoiceProfile> = {
  alpha: {
    channel: 'alpha',
    label: 'ALPHA — Atmosfærisk',
    voiceId: null,
    designPrompt:
      'Cold, neutral, synthetic-sounding female voice, mid-20s, ' +
      'British accent, deliberate pace with pauses between words, ' +
      'slightly degraded shortwave radio quality, emotionless, ' +
      'as if reading numbers from a script to an unknown recipient',
    settings: BASE_VOICE_SETTINGS,
  },
  bravo: {
    channel: 'bravo',
    label: 'BRAVO — Maritim',
    voiceId: null,
    designPrompt:
      'Measured, procedural male voice, neutral maritime radio ' +
      'communication style, bandlimited telephone quality, ' +
      'formal and precise diction, like a coast guard broadcast',
    settings: BASE_VOICE_SETTINGS,
  },
  charlie: {
    channel: 'charlie',
    label: 'CHARLIE — Orbital',
    voiceId: null,
    designPrompt:
      'Slightly synthetic, gender-neutral voice, precise and ' +
      'unhurried, as if transmitted through a satellite link ' +
      'with slight propagation delay, occasional subtle reverb ' +
      'suggesting great distance',
    settings: BASE_VOICE_SETTINGS,
  },
};
