/** Kanaler — én stemmekarakter per informasjonskanal. */
export type VoiceChannel = 'alpha' | 'bravo' | 'charlie';

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export interface VoiceProfile {
  channel: VoiceChannel;
  label: string;
  /** ElevenLabs voice_id — null til audition er ferdig. */
  voiceId: string | null;
  designPrompt: string;
  settings: VoiceSettings;
}

/** Ett avspillbart segment i en kunngjøring. */
export interface Segment {
  /** Relativ sti i phonetic-cache, f.eks. `nato/sierra.mp3`. */
  file: string;
  pauseMs: number;
}

export interface AnnouncementPlan {
  channel: VoiceChannel;
  language: string;
  label: string;
  segments: Segment[];
}
