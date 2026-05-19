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
import { HORIZONTAL_PAD, LOG_MIN_HEIGHT, LOG_PAD_V } from '../theme/openBridgeLayout';
import { usePalette } from '../theme/PaletteContext';
import { fonts } from '../theme/typography';

export const EVENT_LOG_ROW_HEIGHT = 17;
const DEFAULT_ROWS = 2;

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function EventLogPanel({
  maxRows = DEFAULT_ROWS,
}: {
  maxRows?: number;
}): React.JSX.Element {
  const { colors } = usePalette();
  const [entries, setEntries] = useState<FiredEvent[]>([]);
  const visibleRows = Math.max(DEFAULT_ROWS, maxRows);

  useEffect(() => {
    return eventLog.subscribe((es) => setEntries(es.slice(0, visibleRows)));
  }, [visibleRows]);

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
    flex: 1,
    minHeight: LOG_MIN_HEIGHT,
    paddingHorizontal: HORIZONTAL_PAD,
    paddingVertical: LOG_PAD_V,
    borderBottomWidth: 1,
  },
  logRow: {
    flexDirection: 'row',
    gap: 10,
    lineHeight: 16,
  },
  logTs: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
    paddingTop: 1,
  },
  logMsg: {
    fontFamily: fonts.ui,
    fontSize: 12,
    flexShrink: 1,
  },
});
