/**
 * NATO fonetisk alfabet + aviation-tall.
 *
 * Callsigns og ID-er leses alltid fonetisk på engelsk — uavhengig av
 * kanalspråk for kontekstord.
 */

const NATO: Record<string, string> = {
  A: 'alpha',
  B: 'bravo',
  C: 'charlie',
  D: 'delta',
  E: 'echo',
  F: 'foxtrot',
  G: 'golf',
  H: 'hotel',
  I: 'india',
  J: 'juliet',
  K: 'kilo',
  L: 'lima',
  M: 'mike',
  N: 'november',
  O: 'oscar',
  P: 'papa',
  Q: 'quebec',
  R: 'romeo',
  S: 'sierra',
  T: 'tango',
  U: 'uniform',
  V: 'victor',
  W: 'whiskey',
  X: 'x-ray',
  Y: 'yankee',
  Z: 'zulu',
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'niner',
};

const DIGIT_WORDS = new Set(Object.values(NATO).slice(26));

/** "SAS234" → ["sierra","alpha","sierra","two","three","four"] */
export function callsignToPhonetic(callsign: string): string[] {
  return callsign
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('')
    .map((ch) => NATO[ch])
    .filter(Boolean);
}

/** Bearing 95° → ["zero","niner","five"] (alltid tre siffer). */
export function bearingToPhonetic(degrees: number): string[] {
  const clamped = Math.max(0, Math.min(359, Math.round(degrees)));
  const padded = clamped.toString().padStart(3, '0');
  return padded.split('').map((d) => NATO[d]!);
}

/** 42 → ["four","two"] — siffer for siffer. */
export function digitsToPhonetic(value: number): string[] {
  return String(Math.abs(Math.round(value)))
    .split('')
    .map((d) => NATO[d]!);
}

export function phoneticWordToFile(word: string): string {
  const w = word.toLowerCase();
  if (DIGIT_WORDS.has(w)) return `digits/${w}.mp3`;
  return `nato/${w}.mp3`;
}

export function phoneticWordsToFiles(words: string[]): string[] {
  return words.map(phoneticWordToFile);
}
