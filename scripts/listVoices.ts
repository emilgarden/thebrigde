#!/usr/bin/env npx tsx
/**
 * List alle ElevenLabs-stemmer på kontoen.
 *
 *   npm run voice:list
 */

import { listVoices } from './lib/elevenlabs';

async function main(): Promise<void> {
  const voices = await listVoices();
  console.log(`\n${voices.length} stemmer:\n`);
  for (const v of voices) {
    console.log(`  ${v.voice_id}  ${v.name}${v.category ? ` (${v.category})` : ''}`);
  }
  console.log('\nLim voice_id inn i scripts/voiceProfiles.json per kanal.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
