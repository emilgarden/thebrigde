import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function loadEnv(): void {
  dotenv.config({ path: path.join(ROOT, '.env.local') });
}

export function requireApiKey(): string {
  loadEnv();
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'Mangler ELEVENLABS_API_KEY i .env.local (prosjektrot).'
    );
  }
  return key;
}

export function projectRoot(): string {
  return ROOT;
}

export function voiceDevCacheDir(): string {
  return path.join(ROOT, 'voice-dev-cache');
}

export function voiceProfilesPath(): string {
  return path.join(ROOT, 'scripts', 'voiceProfiles.json');
}

export function readVoiceProfiles(): Record<
  string,
  { voiceId: string | null; label?: string }
> {
  const p = voiceProfilesPath();
  if (!fs.existsSync(p)) {
    return { alpha: { voiceId: null }, bravo: { voiceId: null }, charlie: { voiceId: null } };
  }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Record<
    string,
    { voiceId: string | null; label?: string }
  >;
}

export function writeVoiceProfiles(
  profiles: Record<string, { voiceId: string | null; label?: string }>
): void {
  fs.writeFileSync(voiceProfilesPath(), JSON.stringify(profiles, null, 2) + '\n');
}

export function writeManifest(files: string[]): void {
  const dir = voiceDevCacheDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2) + '\n'
  );
}

export function listCachedFiles(): string[] {
  const dir = voiceDevCacheDir();
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  function walk(d: string, prefix: string): void {
    for (const name of fs.readdirSync(d)) {
      if (name === 'manifest.json') continue;
      const full = path.join(d, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (fs.statSync(full).isDirectory()) walk(full, rel);
      else if (name.endsWith('.mp3')) out.push(rel);
    }
  }
  walk(dir, '');
  return out.sort();
}
