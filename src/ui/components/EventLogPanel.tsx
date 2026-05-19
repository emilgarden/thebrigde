/**
 * Event-logg — tabular ts + melding (OpenBridge layout).
 *
 * Erstatter EventLogStrip i MainScreen. Viser de 2 siste hendelsene
 * som i bridge-ux-v7.html.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FiredEvent } from '../../audio/eventScheduler';
import * as eventLog from '../../state/eventLog';
import { usePalette } from '../theme/PaletteContext';

const VISIBLE_ROWS = 2;

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function EventLogPanel(): React.JSX.Element {
  const { colors } = usePalette();
  const [entries, setEntries] = useState<FiredEvent[]>([]);

  useEffect(() => {
    return eventLog.subscribe((es) => setEntries(es.slice(0, VISIBLE_ROWS)));
  }, []);

  const rows =
    entries.length === 0
      ? [{ ts: '—', msg: 'Waiting for activation', fresh: false }]
      : entries.map((e, i) => ({
          ts: fmtTime(e.timestampMs),
          msg: e.message,
          fresh: i === 0,
        }));

  return (
    <View
      style={[
        styles.log,
        { borderBottomColor: colors.borderLo },
      ]}
    >
      {rows.map((row, i) => (
        <View key={`${row.ts}-${i}`} style={styles.logRow}>
          <Text
            style={[
              styles.logTs,
              { color: row.fresh ? colors.sub : colors.dim },
            ]}
          >
            {row.ts}
          </Text>
          <Text
            style={[
              styles.logMsg,
              {
                color: row.fresh
                  ? colors.text
                  : entries.length === 0
                  ? colors.dim
                  : colors.sub,
                fontStyle: entries.length === 0 ? 'italic' : 'normal',
              },
            ]}
            numberOfLines={1}
          >
            {row.msg}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  log: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 54,
    borderBottomWidth: 1,
  },
  logRow: {
    flexDirection: 'row',
    gap: 10,
    lineHeight: 18,
  },
  logTs: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
    paddingTop: 1,
  },
  logMsg: {
    fontSize: 12,
    flexShrink: 1,
  },
});
