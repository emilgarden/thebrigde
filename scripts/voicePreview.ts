#!/usr/bin/env npx tsx
/**
 * Generer én preview-fil til voice-dev-cache/.
 *
 *   npm run voice:preview -- --text "bearing" --channel alpha --lang en
 *   npm run voice:preview -- --text "cap" --channel alpha --lang fr --out alpha/fr/bearing.mp3
 *   npm run voice:preview -- --phonetic sierra,alpha,sierra
 */

import path from 'node:path';
import {
  listCachedFiles,
  readVoiceProfiles,
  voiceDevCacheDir,
  writeManifest,
} from './lib/env';
import { writeSpeechFile } from './lib/elevenlabs';
import { VOICE_PROFILES } from '../src/voice/profiles';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const text = arg('text');
  const phonetic = arg('phonetic');
  const channel = (arg('channel') ?? 'alpha') as 'alpha' | 'bravo' | 'charlie';
  const lang = arg('lang') ?? 'en';
  const outRel = arg('out');
  const voiceOverride = arg('voice');

  if (!text && !phonetic) {
    console.error(
      'Bruk --text "..." eller --phonetic sierra,alpha,sierra'
    );
    process.exit(1);
  }

  const profiles = readVoiceProfiles();
  const voiceId =
    voiceOverride ??
    profiles[channel]?.voiceId ??
    null;

  if (!voiceId) {
    console.error(
      `\nIngen voice_id for kanal "${channel}".\n` +
        '  1. npm run voice:list\n' +
        '  2. Sett voiceId i scripts/voiceProfiles.json\n' +
        '  eller bruk --voice <id>\n'
    );
    process.exit(1);
  }

  const spoken = phonetic
    ? phonetic.split(',').join(' ')
    : text!;

  const relative =
    outRel ??
    (phonetic
      ? `preview/${channel}-${Date.now()}.mp3`
      : `preview/${channel}-${lang}-${Date.now()}.mp3`);

  const outPath = path.join(voiceDevCacheDir(), relative);
  console.log(`Genererer: ${relative}`);
  console.log(`  stemme: ${voiceId}`);
  console.log(`  tekst:  "${spoken}"`);
  console.log(`  språk:  ${lang}`);

  await writeSpeechFile(outPath, {
    voiceId,
    text: spoken,
    language: lang,
    settings: VOICE_PROFILES[channel].settings,
  });

  writeManifest(listCachedFiles());
  console.log(`\nFerdig → voice-dev-cache/${relative}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
