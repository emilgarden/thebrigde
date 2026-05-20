/**
 * Sensorrecorder — lagrer FusedState-snapshots til JSON-fil for senere analyse.
 *
 * Sampling-rate: 5 Hz (200 ms intervall). Prøver flushes til fil hvert 30. sekund
 * slik at data ikke går tapt hvis appen krasjer. Format v2 er NDJSON (én sample
 * per linje) slik at minnebruken forblir flat under lange opptak.
 *
 * Filer havner i app-sandboxens Documents-mappe og kan deles ut via
 * `Share.share({ url })` fra UI.
 */

import { Share } from 'react-native';
import {
  Directory,
  File,
  FileHandle,
  Paths,
} from 'expo-file-system';
import * as fusion from './fusion';
import { FusedState } from './types';

const SAMPLE_INTERVAL_MS = 200; // 5 Hz
const FLUSH_INTERVAL_MS = 30_000;

interface Sample {
  t: number; // ms siden start
  mag_mag: number;
  mag_dev: number;
  mag_x: number;
  mag_y: number;
  mag_z: number;
  mag_pan: number;
  baro_p: number;
  baro_alt: number | null;
  baro_dalt: number;
  accel_mag: number;
  motion_i: number;
  gyro_mag: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  rotation_i: number;
  speed: number;
  speed_kmh: number;
  heading: number;
  has_fix: boolean;
}

type StatKey =
  | 'mag_mag'
  | 'mag_dev'
  | 'baro_p'
  | 'baro_dalt'
  | 'motion_i'
  | 'gyro_mag'
  | 'rotation_i'
  | 'speed_kmh';

const STAT_KEYS: StatKey[] = [
  'mag_mag',
  'mag_dev',
  'baro_p',
  'baro_dalt',
  'motion_i',
  'gyro_mag',
  'rotation_i',
  'speed_kmh',
];

interface RunningStat {
  min: number;
  max: number;
  sum: number;
  count: number;
}

const encoder = new TextEncoder();

let buffer: Sample[] = [];
let recording = false;
let startedAt: number | null = null;
let lastSampleAt = 0;
let unsubscribe: (() => void) | null = null;
let flushIv: ReturnType<typeof setInterval> | null = null;
let file: File | null = null;
let handle: FileHandle | null = null;
let baselineSnapshot: number | null = null;
let totalSamplesWritten = 0;
let headerWritten = false;
const runningStats: Partial<Record<StatKey, RunningStat>> = {};

const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function fusedToSample(s: FusedState, t: number): Sample {
  return {
    t,
    mag_mag: s.mag.magnitude,
    mag_dev: s.magDeviation,
    mag_x: s.mag.x,
    mag_y: s.mag.y,
    mag_z: s.mag.z,
    mag_pan: s.magPan,
    baro_p: s.baro.pressure,
    baro_alt: s.baro.relativeAltitude,
    baro_dalt: s.altitudeDelta,
    accel_mag: s.accel.magnitude,
    motion_i: s.motionIntensity,
    gyro_mag: s.gyro.magnitude,
    gyro_x: s.gyro.x,
    gyro_y: s.gyro.y,
    gyro_z: s.gyro.z,
    rotation_i: s.rotationIntensity,
    speed: s.speed,
    speed_kmh: s.speedKmh,
    heading: s.heading,
    has_fix: s.hasGpsFix,
  };
}

function trackSample(sample: Sample): void {
  for (const key of STAT_KEYS) {
    const v = sample[key];
    const st = runningStats[key];
    if (!st) {
      runningStats[key] = { min: v, max: v, sum: v, count: 1 };
      continue;
    }
    st.min = Math.min(st.min, v);
    st.max = Math.max(st.max, v);
    st.sum += v;
    st.count += 1;
  }
}

function appendText(text: string): void {
  if (!handle) return;
  handle.offset = handle.size ?? 0;
  handle.writeBytes(encoder.encode(text));
}

function writeHeader(): void {
  if (!handle || headerWritten || startedAt === null) return;
  appendText(
    `${JSON.stringify({
      version: 2,
      format: 'ndjson',
      startedAt: new Date(startedAt).toISOString(),
      sampleIntervalMs: SAMPLE_INTERVAL_MS,
      magBaseline: baselineSnapshot,
    })}\n`
  );
  headerWritten = true;
}

function flushBufferToDisk(): void {
  if (!handle || buffer.length === 0) return;
  writeHeader();
  const chunk = buffer.splice(0, buffer.length);
  appendText(`${chunk.map((s) => JSON.stringify(s)).join('\n')}\n`);
  for (const sample of chunk) trackSample(sample);
  totalSamplesWritten += chunk.length;
}

function writeFooter(): void {
  if (!handle || startedAt === null) return;
  appendText(
    `${JSON.stringify({
      _footer: {
        durationMs: Date.now() - startedAt,
        sampleCount: totalSamplesWritten,
        magBaseline: baselineSnapshot,
      },
    })}\n`
  );
}

export function start(): File {
  if (recording && file) return file;

  const recordingsDir = new Directory(Paths.document, 'recordings');
  if (!recordingsDir.exists) {
    recordingsDir.create({ intermediates: true });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const filename = `session-${ts}.json`;
  const newFile = new File(recordingsDir, filename);
  newFile.create();
  file = newFile;
  handle = file.open();

  buffer = [];
  startedAt = Date.now();
  lastSampleAt = 0;
  baselineSnapshot = fusion.getState().magBaseline;
  totalSamplesWritten = 0;
  headerWritten = false;
  for (const key of STAT_KEYS) delete runningStats[key];
  recording = true;

  unsubscribe = fusion.subscribe((s) => {
    if (!recording || startedAt === null) return;
    const now = Date.now() - startedAt;
    if (now - lastSampleAt < SAMPLE_INTERVAL_MS) return;
    lastSampleAt = now;
    buffer.push(fusedToSample(s, now));
    if (baselineSnapshot === null && s.magBaseline !== null) {
      baselineSnapshot = s.magBaseline;
    }
  });

  writeHeader();
  flushIv = setInterval(flushBufferToDisk, FLUSH_INTERVAL_MS);

  console.log('[recorder] opptak startet:', file.uri);
  emit();
  return file;
}

export function stop(): { uri: string; samples: number; duration: number } | null {
  if (!recording || !file || startedAt === null) return null;

  recording = false;
  if (flushIv) clearInterval(flushIv);
  flushIv = null;
  if (unsubscribe) unsubscribe();
  unsubscribe = null;

  flushBufferToDisk();
  writeFooter();
  if (handle) {
    handle.close();
    handle = null;
  }

  const duration = Date.now() - startedAt;
  const result = { uri: file.uri, samples: totalSamplesWritten, duration };

  console.log(
    '[recorder] opptak ferdig:',
    result.samples,
    'samples,',
    (duration / 1000).toFixed(1),
    'sek →',
    file.uri
  );

  console.log('[recorder] summary:', JSON.stringify(summarize()));

  file = null;
  startedAt = null;
  emit();
  return result;
}

function summarize(): Record<string, unknown> {
  if (totalSamplesWritten === 0 && buffer.length === 0) {
    return { sampleCount: 0 };
  }

  const stats = (key: StatKey) => {
    const st = runningStats[key];
    if (!st) return { min: 0, max: 0, avg: 0 };
    return {
      min: Number(st.min.toFixed(3)),
      max: Number(st.max.toFixed(3)),
      avg: Number((st.sum / st.count).toFixed(3)),
    };
  };

  return {
    sampleCount: totalSamplesWritten,
    magBaseline: baselineSnapshot,
    mag_mag: stats('mag_mag'),
    mag_dev: stats('mag_dev'),
    baro_p: stats('baro_p'),
    baro_dalt: stats('baro_dalt'),
    motion_i: stats('motion_i'),
    gyro_mag: stats('gyro_mag'),
    rotation_i: stats('rotation_i'),
    speed_kmh: stats('speed_kmh'),
  };
}

export function isRecording(): boolean {
  return recording;
}

export function getStats(): {
  recording: boolean;
  duration: number;
  sampleCount: number;
  fileUri: string | null;
} {
  return {
    recording,
    duration: startedAt ? Date.now() - startedAt : 0,
    sampleCount: totalSamplesWritten + buffer.length,
    fileUri: file?.uri ?? null,
  };
}

export async function shareLastFile(uri: string): Promise<void> {
  try {
    await Share.share({ url: uri });
  } catch (e) {
    console.warn('[recorder] share feilet:', e);
  }
}

export interface PastRecording {
  uri: string;
  name: string;
  size: number;
  modifiedMs: number;
}

export function listPastRecordings(): PastRecording[] {
  const dir = new Directory(Paths.document, 'recordings');
  if (!dir.exists) return [];
  const entries = dir.list();
  const results: PastRecording[] = [];
  for (const e of entries) {
    if (!(e instanceof File)) continue;
    if (!e.name.endsWith('.json')) continue;
    results.push({
      uri: e.uri,
      name: e.name,
      size: e.size ?? 0,
      modifiedMs: e.modificationTime ?? 0,
    });
  }
  results.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return results;
}

export function deleteRecording(uri: string): boolean {
  try {
    const f = new File(uri);
    if (!f.exists) return false;
    f.delete();
    return true;
  } catch (e) {
    console.warn('[recorder] delete feilet:', e);
    return false;
  }
}
