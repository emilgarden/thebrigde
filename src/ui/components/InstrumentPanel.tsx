/**
 * OpenBridge instrumentpanel — ett panel i 2×2-gridet.
 *
 * 3 px statussøyle øverst, label, stor monospace-verdi, optional bar.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '../theme/PaletteContext';
import { fonts } from '../theme/typography';

export type InstrumentStatus = 'idle' | 'hi' | 'warn' | 'alarm';

interface InstrumentPanelProps {
  label: string;
  value: string;
  unit: string;
  status?: InstrumentStatus;
  /** 0–1 for progress bar under verdien */
  barFill?: number;
  /** Speed-panel: viser 0–80 km/h-skala i stedet for enkel bar */
  speedScale?: boolean;
}

const SPEED_TICKS = [0, 15, 30, 50, 70, 80];

export default function InstrumentPanel({
  label,
  value,
  unit,
  status = 'idle',
  barFill = 0,
  speedScale = false,
}: InstrumentPanelProps): React.JSX.Element {
  const { colors } = usePalette();

  const statusColor = useMemo(() => {
    switch (status) {
      case 'alarm':
        return colors.alarm;
      case 'warn':
        return colors.warning;
      case 'hi':
        return colors.active;
      default:
        return colors.dim;
    }
  }, [status, colors]);

  const valueColor =
    status === 'alarm'
      ? colors.alarm
      : status === 'warn'
      ? colors.warning
      : status === 'hi'
      ? colors.text
      : colors.dim;

  const fillPct = Math.max(0, Math.min(1, barFill)) * 100;

  return (
    <View style={[styles.instr, { backgroundColor: colors.bg }]}>
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      <View style={styles.body}>
        <Text style={[styles.instrLabel, { color: colors.sub }]}>
          {label}
        </Text>
        <Text style={[styles.instrVal, { color: valueColor }]}>
          {value}
          <Text style={[styles.instrUnit, { color: colors.sub }]}>
            {unit}
          </Text>
        </Text>

        {speedScale ? (
          <>
            <View
              style={[styles.speedScale, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.speedFill,
                  {
                    backgroundColor: colors.active,
                    width: `${fillPct}%`,
                  },
                ]}
              />
              {[18.75, 37.5, 62.5, 87.5].map((pct) => (
                <View
                  key={pct}
                  style={[
                    styles.speedTick,
                    {
                      left: `${pct}%`,
                      backgroundColor: colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.speedLabels}>
              {SPEED_TICKS.map((t) => (
                <Text
                  key={t}
                  style={[styles.speedLabel, { color: colors.dim }]}
                >
                  {t}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <View style={[styles.bar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: statusColor,
                  width: `${fillPct}%`,
                },
              ]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  instr: {
    overflow: 'hidden',
  },
  statusBar: {
    height: 3,
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  instrLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  instrVal: {
    fontFamily: fonts.mono,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    lineHeight: 22,
  },
  instrUnit: {
    fontFamily: fonts.ui,
    fontSize: 11,
    marginLeft: 3,
  },
  bar: {
    height: 2,
    marginTop: 8,
  },
  barFill: {
    height: '100%',
  },
  speedScale: {
    position: 'relative',
    height: 3,
    marginTop: 8,
  },
  speedFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
  },
  speedTick: {
    position: 'absolute',
    top: -2,
    width: 1,
    height: 7,
    marginLeft: -0.5,
  },
  speedLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  speedLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontVariant: ['tabular-nums'],
  },
});
