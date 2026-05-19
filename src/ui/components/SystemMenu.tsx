/**
 * System-meny — palett-velger bak ⚙-ikon (OpenBridge-mønster).
 *
 * Sounds/Onboarding/EarconList kommer i Iter 10 — placeholder-rader
 * vises men er deaktivert. Session recorder (dev-verktøy fra Iter 2)
 * er tilgjengelig her.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import RecorderBar from './RecorderBar';
import { usePalette } from '../theme/PaletteContext';
import { PaletteMode } from '../theme/palettes';

interface SystemMenuProps {
  visible: boolean;
}

const PALETTE_BUTTONS: { mode: PaletteMode; label: string }[] = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'bright', label: 'Bright' },
  { mode: 'day', label: 'Day' },
  { mode: 'dusk', label: 'Dusk' },
  { mode: 'night', label: 'Night' },
];

export default function SystemMenu({
  visible,
}: SystemMenuProps): React.JSX.Element | null {
  const { colors, mode, setMode, sourceLabel } = usePalette();

  if (!visible) return null;

  return (
    <View
      style={[
        styles.menu,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[styles.section, { borderBottomColor: colors.borderLo }]}
      >
        <Text style={[styles.sectionLabel, { color: colors.dim }]}>
          Display palette
        </Text>
        <View style={styles.paletteRow}>
          {PALETTE_BUTTONS.map(({ mode: m, label }) => {
            const active = mode === m;
            const topColor =
              m === 'auto' ? colors.nominal : colors.active;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[
                  styles.pBtn,
                  {
                    backgroundColor: active ? colors.surface : colors.bg,
                    borderColor: colors.border,
                    borderTopColor: active ? topColor : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pBtnText,
                    { color: active ? colors.text : colors.sub },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.paletteSource, { color: colors.dim }]}>
          {sourceLabel}
        </Text>
      </View>

      <View
        style={[styles.section, { borderBottomColor: colors.borderLo }]}
      >
        <Text style={[styles.sectionLabel, { color: colors.dim }]}>
          Sounds
        </Text>
        <MenuAction
          label="Sounds & Earcons"
          sub="BAM alert hierarchy · all sound patterns"
          disabled
          colors={colors}
        />
        <MenuAction
          label="Onboarding"
          sub="Replay the sound introduction"
          disabled
          colors={colors}
        />
      </View>

      <View style={[styles.section, { borderBottomWidth: 0 }]}>
        <Text style={[styles.sectionLabel, { color: colors.dim }]}>
          Developer
        </Text>
        <RecorderBar embedded />
      </View>
    </View>
  );
}

function MenuAction({
  label,
  sub,
  disabled,
  colors,
}: {
  label: string;
  sub: string;
  disabled?: boolean;
  colors: ReturnType<typeof usePalette>['colors'];
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.menuAction,
        { borderBottomColor: colors.borderLo, opacity: disabled ? 0.45 : 1 },
      ]}
    >
      <View style={styles.menuActionText}>
        <Text style={[styles.menuActionLabel, { color: colors.text }]}>
          {label}
        </Text>
        <Text style={[styles.menuActionSub, { color: colors.sub }]}>
          {sub}
        </Text>
      </View>
      <Text style={[styles.menuActionArrow, { color: colors.sub }]}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    borderBottomWidth: 1,
  },
  section: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 5,
  },
  pBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderTopWidth: 2,
    alignItems: 'center',
  },
  pBtnText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  paletteSource: {
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 6,
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  menuActionText: {
    flex: 1,
  },
  menuActionLabel: {
    fontSize: 12,
  },
  menuActionSub: {
    fontSize: 10,
    marginTop: 2,
  },
  menuActionArrow: {
    fontSize: 12,
    marginLeft: 8,
  },
});
