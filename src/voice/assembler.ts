import type { AnnouncementPlan, Segment } from './types';

export function seg(file: string, pauseMs: number): Segment {
  return { file, pauseMs };
}

/** Number-station ramme + innhold + repetisjon. */
export function wrapNumberStation(
  label: string,
  channel: AnnouncementPlan['channel'],
  language: string,
  groups: Segment[][]
): AnnouncementPlan {
  const segments: Segment[] = [
    seg('frame/attention.mp3', 1200),
    seg(`frame/${groups.length}-groups.mp3`, 1500),
  ];
  for (const group of groups) {
    segments.push(...group);
    segments.push(seg('frame/stand-by.mp3', 1000));
  }
  segments.push(seg('frame/message-repeats.mp3', 1500));
  for (const group of groups) {
    segments.push(...group);
    segments.push(seg('frame/stand-by.mp3', 1000));
  }
  segments.push(seg('frame/end-of-message.mp3', 0));

  return { channel, language, label, segments };
}

export function planDurationMs(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.pauseMs, 0);
}
