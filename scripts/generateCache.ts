#!/usr/bin/env npx tsx
/**
 * Generer minimal phonetic-cache for Sound Lab-scenarioer.
 *
 * Krever voice_id per kanal i scripts/voiceProfiles.json.
 *
 *   npm run voice:generate
 *   npm run voice:generate -- --langs en,fr
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  listCachedFiles,
  readVoiceProfiles,
  voiceDevCacheDir,
  writeManifest,
} from './lib/env';
import { writeSpeechFile } from './lib/elevenlabs';
import {
  ALPHA_KEYWORDS,
  BRAVO_KEYWORDS,
  CHARLIE_KEYWORDS,
  CONTEXT_KEYWORDS,
  FRAME_KEYWORDS,
  type ContextKeywords,
} from '../src/voice/keywords';
import { VOICE_PROFILES } from '../src/voice/profiles';

const NATO_WORDS = [
  'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel',
  'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa',
  'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey',
  'x-ray', 'yankee', 'zulu',
];

const DIGIT_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner',
];

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1]! : fallback;
}

async function genFile(
  relative: string,
  voiceId: string,
  text: string,
  lang: string,
  settings: typeof VOICE_PROFILES.alpha.settings
): Promise<void> {
  const out = path.join(voiceDevCacheDir(), relative);
  console.log(`  ${relative}`);
  await writeSpeechFile(out, { voiceId, text, language: lang, settings });
}

async function main(): Promise<void> {
  const langs = arg('langs', 'en,fr').split(',').map((s) => s.trim());
  const profiles = readVoiceProfiles();
  const skipExisting = process.argv.includes('--skip-existing');

  for (const ch of ['alpha', 'bravo', 'charlie'] as const) {
    if (!profiles[ch]?.voiceId) {
      console.error(
        `\nMangler voiceId for "${ch}" i scripts/voiceProfiles.json.\n` +
          'Kjør: npm run voice:list → sett ID → npm run voice:generate\n'
      );
      process.exit(1);
    }
  }

  console.log('\nGenererer voice-dev-cache (minimal sett)...\n');

  // NATO + digits — bruk charlie-stemme, engelsk
  const natoVoice = profiles.charlie.voiceId!;
  for (const w of NATO_WORDS) {
    const rel = `nato/${w}.mp3`;
    const out = path.join(voiceDevCacheDir(), rel);
    if (skipExisting && fs.existsSync(out)) continue;
    await genFile(rel, natoVoice, w, 'en', VOICE_PROFILES.charlie.settings);
  }
  for (const w of DIGIT_WORDS) {
    const rel = `digits/${w}.mp3`;
    await genFile(rel, natoVoice, w, 'en', VOICE_PROFILES.charlie.settings);
  }

  // Frame — alpha stemme
  for (const [key, text] of Object.entries(FRAME_KEYWORDS)) {
    await genFile(
      `frame/${key}.mp3`,
      profiles.alpha.voiceId!,
      text,
      'en',
      VOICE_PROFILES.alpha.settings
    );
  }

  // Kanalord per kanal (engelsk)
  for (const [key, text] of Object.entries(ALPHA_KEYWORDS)) {
    await genFile(
      `alpha/en/${key}.mp3`,
      profiles.alpha.voiceId!,
      text,
      'en',
      VOICE_PROFILES.alpha.settings
    );
  }
  for (const [key, text] of Object.entries(BRAVO_KEYWORDS)) {
    await genFile(
      `bravo/en/${key}.mp3`,
      profiles.bravo.voiceId!,
      text,
      'en',
      VOICE_PROFILES.bravo.settings
    );
  }
  for (const [key, text] of Object.entries(CHARLIE_KEYWORDS)) {
    await genFile(
      `charlie/en/${key}.mp3`,
      profiles.charlie.voiceId!,
      text,
      'en',
      VOICE_PROFILES.charlie.settings
    );
  }

  // Kontekstord per språk på alpha-kanal (fly-destinasjon)
  for (const lang of langs) {
    const kw = CONTEXT_KEYWORDS[lang];
    if (!kw) {
      console.warn(`  hopper over ukjent språk: ${lang}`);
      continue;
    }
    for (const [key, text] of Object.entries(kw) as [keyof ContextKeywords, string][]) {
      await genFile(
        `alpha/${lang}/${key}.mp3`,
        profiles.alpha.voiceId!,
        text,
        lang,
        VOICE_PROFILES.alpha.settings
      );
    }
  }

  writeManifest(listCachedFiles());
  console.log(`\nFerdig. ${listCachedFiles().length} filer i voice-dev-cache/\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
