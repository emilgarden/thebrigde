/**
 * Kompakt event-log-strip — viser siste 4 fyrte BAM-hendelser i en
 * smal liste øverst i hovedvisningen. Bevisst minimal — den fulle
 * EventLogScreen kommer i en senere iter sammen med MainScreen (Iter 5).
 *
 * Hver rad:
 *   ████  HH:MM:SS  MAG ANOMALY +47µT
 *    ^---- 3 px BAM-fargestrek (alarm/warning)
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import * as eventLog from '../../state/eventLog';
import type { FiredEvent } from '../../audio/eventScheduler';

const VISIBLE_ROWS = 4;

const C = {
  bg: '#0a0d14',
  border: '#18222e',
  text: '#8aa0b8',
  sub: '#2e3f52',
  alarm: '#c84545',
  warning: '#d39430',
  emptyLabel: '#2e3f52',
};

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function EventLogStrip(): React.JSX.Element {
  const [entries, setEntries] = useState<FiredEvent[]>([]);

  useEffect(() => {
    return eventLog.subscribe((es) => setEntries(es.slice(0, VISIBLE_ROWS)));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>EVENT LOG</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>— ingen hendelser —</Text>
      ) : (
        entries.map((e) => (
          <View key={`${e.timestampMs}-${e.key}`} style={styles.row}>
            <View
              style={[
                styles.severity,
                {
                  backgroundColor:
                    e.severity === 'alarm' ? C.alarm : C.warning,
                },
              ]}
            />
            <Text style={styles.time}>{fmtTime(e.timestampMs)}</Text>
            <Text style={styles.msg} numberOfLines={1}>
              {e.message}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#0f1420',
  },
  heading: {
    fontSize: 9,
    color: C.sub,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  empty: {
    fontSize: 10,
    color: C.emptyLabel,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  severity: {
    width: 3,
    height: 12,
    marginRight: 8,
  },
  time: {
    fontSize: 10,
    color: C.sub,
    fontVariant: ['tabular-nums'],
    marginRight: 10,
  },
  msg: {
    fontSize: 11,
    color: C.text,
    flexShrink: 1,
  },
});
