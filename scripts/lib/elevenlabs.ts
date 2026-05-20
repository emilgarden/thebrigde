/**
 * ElevenLabs API — KUN for Node-scripts på Mac. Aldri importer i app-kode.
 */

import fs from 'node:fs';
import path from 'node:path';
import { requireApiKey } from './env';

export const MODEL_ID = 'eleven_multilingual_v2';

export const DEFAULT_SETTINGS = {
  stability: 0.85,
  similarity_boost: 0.40,
  style: 0.0,
  use_speaker_boost: false,
};

export interface VoiceInfo {
  voice_id: string;
  name: string;
  category?: string;
}

export async function listVoices(): Promise<VoiceInfo[]> {
  const key = requireApiKey();
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': key },
  });
  if (!res.ok) {
    throw new Error(`listVoices feilet: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { voices: VoiceInfo[] };
  return data.voices;
}

export async function generateSpeech(opts: {
  voiceId: string;
  text: string;
  language?: string;
  settings?: typeof DEFAULT_SETTINGS;
}): Promise<Buffer> {
  const key = requireApiKey();
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${opts.voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: opts.text,
        model_id: MODEL_ID,
        voice_settings: opts.settings ?? DEFAULT_SETTINGS,
        ...(opts.language ? { language_code: opts.language } : {}),
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`TTS feilet: ${res.status} ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function writeSpeechFile(
  outPath: string,
  opts: Parameters<typeof generateSpeech>[0]
): Promise<void> {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const buf = await generateSpeech(opts);
  fs.writeFileSync(outPath, buf);
}
