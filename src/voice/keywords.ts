/** Kontekstord per språk (fly / generell kanal). */
export type ContextKeywords = {
  bearing: string;
  overhead: string;
  altitude: string;
  descending: string;
  ascending: string;
  destination: string;
};

/** Kanalspesifikke ord (engelsk-only i første iter). */
export type ChannelKeywords = Record<string, string>;

export const ALPHA_KEYWORDS: ChannelKeywords = {
  'geomagnetic-storm': 'geomagnetic storm',
  'aurora-possible': 'aurora possible',
  'kp-index': 'Kp index',
  'air-quality': 'air quality',
};

export const BRAVO_KEYWORDS: ChannelKeywords = {
  approaching: 'approaching',
  departing: 'departing',
  'gale-warning': 'gale warning',
  'navigational-hazard': 'navigational hazard',
  tanker: 'tanker',
  'cargo-vessel': 'cargo vessel',
  'norwegian-coastal-radio': 'Norwegian coastal radio',
};

export const CHARLIE_KEYWORDS: ChannelKeywords = {
  bearing: 'bearing',
  overhead: 'overhead',
  elevation: 'elevation',
  'max-elevation': 'maximum elevation',
  'time-to-pass': 'time to pass',
  'solar-wind': 'solar wind',
  'aurora-possible': 'aurora possible',
  'voyager-one': 'Voyager one',
};

export const FRAME_KEYWORDS: ChannelKeywords = {
  attention: 'Attention',
  'end-of-message': 'End of message',
  'message-repeats': 'Message repeats',
  'stand-by': 'Stand by',
  'priority-message': 'Priority message',
  '1-groups': 'One groups',
  '2-groups': 'Two groups',
  '3-groups': 'Three groups',
  '4-groups': 'Four groups',
  '5-groups': 'Five groups',
  '6-groups': 'Six groups',
  '7-groups': 'Seven groups',
  '8-groups': 'Eight groups',
  '9-groups': 'Nine groups',
};

/** Utvidet sett — start med de viktigste for audition. */
export const CONTEXT_KEYWORDS: Record<string, ContextKeywords> = {
  en: {
    bearing: 'bearing',
    overhead: 'overhead',
    altitude: 'altitude',
    descending: 'descending',
    ascending: 'ascending',
    destination: 'destination',
  },
  no: {
    bearing: 'kurs',
    overhead: 'overhead',
    altitude: 'høyde',
    descending: 'synkende',
    ascending: 'stigende',
    destination: 'destinasjon',
  },
  fr: {
    bearing: 'cap',
    overhead: 'au-dessus',
    altitude: 'altitude',
    descending: 'en descente',
    ascending: 'en montée',
    destination: 'à destination de',
  },
  de: {
    bearing: 'Kurs',
    overhead: 'im Überflug',
    altitude: 'Höhe',
    descending: 'im Sinkflug',
    ascending: 'im Steigflug',
    destination: 'Ziel',
  },
  ja: {
    bearing: '方位',
    overhead: '上空',
    altitude: '高度',
    descending: '降下中',
    ascending: '上昇中',
    destination: '目的地',
  },
};

export function contextKeywordFile(
  channel: 'alpha' | 'bravo' | 'charlie',
  lang: string,
  key: keyof ContextKeywords
): string {
  return `${channel}/${lang}/${key}.mp3`;
}

export function channelKeywordFile(
  channel: 'alpha' | 'bravo' | 'charlie',
  key: string
): string {
  return `${channel}/en/${key}.mp3`;
}

export function frameKeywordFile(key: string): string {
  return `frame/${key}.mp3`;
}
