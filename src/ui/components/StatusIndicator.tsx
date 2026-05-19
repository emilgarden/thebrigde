/**
 * OpenBridge statusindikator — 3 px vertikal fargestrek + label.
 * Semantikk: ok (nominal), warn (warning), err (alarm).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '../theme/PaletteContext';
import { fonts } from '../theme/typography';

export type IndicatorState = 'idle' | 'ok' | 'warn' | 'err';

interface StatusIndicatorProps {
  label: string;
  state: IndicatorState;
}

export default function StatusIndicator({
  label,
  state,
}: StatusIndicatorProps): React.JSX.Element {
  const { colors } = usePalette();

  const barColor =
    state === 'ok'
      ? colors.nominal
      : state === 'warn'
      ? colors.warning
      : state === 'err'
      ? colors.alarm
      : colors.dim;

  const labelColor =
    state === 'ok'
      ? colors.text
      : state === 'warn'
      ? colors.warning
      : state === 'err'
      ? colors.alarm
      : colors.sub;

  return (
    <View
      style={[
        styles.ind,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <Text style={[styles.lbl, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingRight: 6,
    paddingLeft: 4,
    borderWidth: 1,
  },
  bar: {
    width: 3,
    height: 13,
  },
  lbl: {
    fontFamily: fonts.uiMedium,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
