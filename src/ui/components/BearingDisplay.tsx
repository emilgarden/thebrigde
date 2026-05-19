/**
 * Bearing-display — North-up kompass (OpenBridge / IEC 62288).
 *
 * Port av canvas-logikken i bridge-ux-v7.html linje 704–760.
 * Implementert med ren React Native (View/Text) — ingen react-native-svg,
 * slik at dev client ikke trenger Xcode-rebuild ved UI-endringer.
 *
 * Orbital/fly-objekter plottes her når Lag 4/5 er på plass.
 */

import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  BEARING_SIZE,
  HORIZONTAL_PAD,
} from '../theme/openBridgeLayout';
import { usePalette } from '../theme/PaletteContext';
import { fonts } from '../theme/typography';

interface BearingDisplayProps {
  running: boolean;
  heading: number;
  objectCount?: number;
  onPress?: () => void;
  /** Bearing-canvas i pt — default OpenBridge 347 (iPhone 13 mini) */
  size?: number;
}

function degToRad(d: number): number {
  return ((d - 90) * Math.PI) / 180;
}

function polarXY(
  cx: number,
  cy: number,
  bearingDeg: number,
  radius: number
): { x: number; y: number } {
  const rad = degToRad(bearingDeg);
  return {
    x: cx + Math.cos(rad) * radius,
    y: cy + Math.sin(rad) * radius,
  };
}

function Tick({
  cx,
  cy,
  r,
  angle,
  major,
  borderColor,
  dimColor,
}: {
  cx: number;
  cy: number;
  r: number;
  angle: number;
  major: boolean;
  borderColor: string;
  dimColor: string;
}): React.JSX.Element {
  const len = major ? r * 0.09 : r * 0.05;
  return (
    <View
      style={[
        styles.tick,
        {
          left: cx - (major ? 0.5 : 0.25),
          top: cy,
          height: len,
          width: major ? 1 : 0.5,
          backgroundColor: major ? borderColor : dimColor,
          transform: [{ translateY: -r }, { rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

export default function BearingDisplay({
  running,
  heading,
  objectCount = 0,
  onPress,
  size: sizeProp,
}: BearingDisplayProps): React.JSX.Element {
  const { colors } = usePalette();
  const { width: windowWidth } = useWindowDimensions();
  const size = sizeProp ?? Math.min(BEARING_SIZE, windowWidth - HORIZONTAL_PAD * 2);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;

  const headingValid = running && heading >= 0;
  const headingDeg = headingValid ? heading : 0;

  const headingTip = useMemo(() => {
    return polarXY(cx, cy, headingDeg, r - 6);
  }, [cx, cy, headingDeg, r]);

  const cardinals: { l: string; d: number; primary: boolean }[] = [
    { l: 'N', d: 0, primary: true },
    { l: 'E', d: 90, primary: false },
    { l: 'S', d: 180, primary: false },
    { l: 'W', d: 270, primary: false },
  ];

  const centerMessage = !running
    ? 'TAP TO ACTIVATE'
    : objectCount === 0
    ? 'NO OBJECTS OVERHEAD'
    : '';

  const ticks = useMemo(() => {
    const out: React.JSX.Element[] = [];
    for (let d = 0; d < 360; d += 10) {
      out.push(
        <Tick
          key={`tick-${d}`}
          cx={cx}
          cy={cy}
          r={r}
          angle={d}
          major={d % 30 === 0}
          borderColor={colors.border}
          dimColor={colors.dim}
        />
      );
    }
    return out;
  }, [cx, cy, r, colors.border, colors.dim]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel="Bearing display"
    >
      <View style={[styles.canvas, { width: size, height: size }]}>
        <View
          style={[
            styles.bgDisc,
            {
              width: (r + 2) * 2,
              height: (r + 2) * 2,
              left: cx - r - 2,
              top: cy - r - 2,
              borderRadius: r + 2,
              backgroundColor: colors.bearingBg,
            },
          ]}
        />

        {[60, 30].map((elev) => {
          const ringR = r * (1 - elev / 90);
          const label = polarXY(cx, cy, 0, ringR + 8);
          return (
            <React.Fragment key={`elev-${elev}`}>
              <View
                style={[
                  styles.ring,
                  {
                    width: ringR * 2,
                    height: ringR * 2,
                    left: cx - ringR,
                    top: cy - ringR,
                    borderRadius: ringR,
                    borderColor: colors.border,
                  },
                ]}
              />
              <Text
                style={[
                  styles.elevLabel,
                  {
                    left: label.x + 3,
                    top: label.y - 12,
                    color: colors.dim,
                  },
                ]}
              >
                {`${elev}°`}
              </Text>
            </React.Fragment>
          );
        })}

        {ticks}

        {Array.from({ length: 12 }, (_, i) => {
          const d = i * 30;
          if (d % 90 === 0) return null;
          const { x, y } = polarXY(cx, cy, d, r + 13);
          return (
            <Text
              key={`deg-${d}`}
              style={[
                styles.degLabel,
                {
                  left: x - 8,
                  top: y - 6,
                  color: colors.dim,
                },
              ]}
            >
              {String(d)}
            </Text>
          );
        })}

        {cardinals.map(({ l, d, primary }) => {
          const { x, y } = polarXY(cx, cy, d, r + 13);
          return (
            <Text
              key={l}
              style={[
                styles.cardinal,
                primary ? styles.cardinalPrimary : styles.cardinalSecondary,
                {
                  left: x - (primary ? 6 : 5),
                  top: y - 8,
                  color: primary ? colors.text : colors.sub,
                },
              ]}
            >
              {l}
            </Text>
          );
        })}

        {headingValid ? (
          <View
            style={[
              styles.headingMarker,
              {
                left: headingTip.x - 4,
                top: headingTip.y - 5,
                transform: [
                  { rotate: `${headingDeg + 90}deg` }],
              },
            ]}
          >
            <View
              style={[styles.headingTriangle, { borderBottomColor: colors.active }]}
            />
          </View>
        ) : null}

        {centerMessage ? (
          <Text
            style={[
              styles.centerMsg,
              {
                left: 0,
                right: 0,
                top: running ? cy - 8 : cy + 42,
                color: colors.dim,
              },
            ]}
          >
            {centerMessage}
          </Text>
        ) : null}

        <View
          style={[
            styles.centerDot,
            {
              left: cx - 2,
              top: cy - 2,
              backgroundColor: running ? colors.active : colors.dim,
            },
          ]}
        />

        <View
          style={[
            styles.outerRing,
            {
              width: r * 2,
              height: r * 2,
              left: cx - r,
              top: cy - r,
              borderRadius: r,
              borderColor: colors.border,
            },
          ]}
        />
      </View>

      <View style={[styles.ctx, { borderBottomColor: colors.borderLo }]}>
        <Text style={[styles.ctxText, { color: colors.sub }]}>
          {objectCount === 0
            ? '—  objects overhead'
            : `${objectCount} object${objectCount === 1 ? '' : 's'} overhead`}
        </Text>
        <Text style={[styles.ctxText, { color: colors.sub }]}>
          {headingValid
            ? `Heading ${String(Math.round(heading)).padStart(3, '0')}°`
            : 'Heading —°'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PAD,
  },
  canvas: {
    position: 'relative',
  },
  bgDisc: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  elevLabel: {
    position: 'absolute',
    fontFamily: fonts.ui,
    fontSize: 9,
  },
  tick: {
    position: 'absolute',
  },
  degLabel: {
    position: 'absolute',
    fontFamily: fonts.ui,
    fontSize: 9,
    width: 16,
    textAlign: 'center',
  },
  cardinal: {
    position: 'absolute',
  },
  cardinalPrimary: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
  },
  cardinalSecondary: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
  },
  headingMarker: {
    position: 'absolute',
    width: 8,
    height: 10,
    alignItems: 'center',
  },
  headingTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  centerMsg: {
    position: 'absolute',
    fontFamily: fonts.ui,
    fontSize: 11,
    textAlign: 'center',
  },
  centerDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  ctx: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 5,
    paddingHorizontal: HORIZONTAL_PAD,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  ctxText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
  },
});
