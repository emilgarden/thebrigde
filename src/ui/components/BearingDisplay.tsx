/**
 * Bearing-display — North-up kompass (OpenBridge / IEC 62288).
 *
 * Port av canvas-logikken i bridge-ux-v7.html linje 704–760.
 * Orbital/fly-objekter plottes her når Lag 4/5 er på plass —
 * foreløpig vises kun heading-indikator og status-tekst.
 *
 * North-up alltid: displayet roterer aldri (CURSOR.md punkt 18).
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Text as SvgText,
} from 'react-native-svg';

import { usePalette } from '../theme/PaletteContext';

const SIZE = 347;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE * 0.4;

interface BearingDisplayProps {
  running: boolean;
  heading: number;
  objectCount?: number;
  onPress?: () => void;
}

function degToRad(d: number): number {
  return ((d - 90) * Math.PI) / 180;
}

function polarXY(bearingDeg: number, radius: number): { x: number; y: number } {
  const rad = degToRad(bearingDeg);
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY + Math.sin(rad) * radius,
  };
}

export default function BearingDisplay({
  running,
  heading,
  objectCount = 0,
  onPress,
}: BearingDisplayProps): React.JSX.Element {
  const { colors } = usePalette();

  const headingValid = running && heading >= 0;
  const headingDeg = headingValid ? heading : 0;

  const headingTip = useMemo(() => {
    const { x, y } = polarXY(headingDeg, R - 6);
    return { x, y, rad: degToRad(headingDeg) };
  }, [headingDeg]);

  const tickMarks = useMemo(() => {
    const marks: React.ReactNode[] = [];
    for (let d = 0; d < 360; d += 10) {
      const major = d % 30 === 0;
      const inner = polarXY(d, major ? R * 0.91 : R * 0.95);
      const outer = polarXY(d, R);
      marks.push(
        <Line
          key={`tick-${d}`}
          x1={inner.x}
          y1={inner.y}
          x2={outer.x}
          y2={outer.y}
          stroke={major ? colors.border : colors.dim}
          strokeWidth={major ? 1 : 0.5}
        />
      );
    }
    return marks;
  }, [colors.border, colors.dim]);

  const degreeLabels = useMemo(() => {
    const labels: React.ReactNode[] = [];
    for (let d = 0; d < 360; d += 30) {
      if (d % 90 === 0) continue;
      const { x, y } = polarXY(d, R + 13);
      labels.push(
        <SvgText
          key={`deg-${d}`}
          x={x}
          y={y}
          fill={colors.dim}
          fontSize={9}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {String(d)}
        </SvgText>
      );
    }
    return labels;
  }, [colors.dim]);

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

  return (
    <Pressable
      onPress={onPress}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel="Bearing display"
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={CX} cy={CY} r={R + 2} fill={colors.bearingBg} />

        {[60, 30].map((elev) => {
          const r = R * (1 - elev / 90);
          const label = polarXY(0, r + 8);
          return (
            <G key={`elev-${elev}`}>
              <Circle
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText
                x={label.x + 3}
                y={label.y - 5}
                fill={colors.dim}
                fontSize={9}
                textAnchor="start"
              >
                {`${elev}°`}
              </SvgText>
            </G>
          );
        })}

        {tickMarks}
        {degreeLabels}

        {cardinals.map(({ l, d, primary }) => {
          const { x, y } = polarXY(d, R + 13);
          return (
            <SvgText
              key={l}
              x={x}
              y={y}
              fill={primary ? colors.text : colors.sub}
              fontSize={primary ? 12 : 11}
              fontWeight={primary ? '700' : '500'}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {l}
            </SvgText>
          );
        })}

        {headingValid ? (
          <G
            transform={`translate(${headingTip.x}, ${headingTip.y}) rotate(${(headingTip.rad * 180) / Math.PI + 90})`}
          >
            <Path d="M 0 -5 L 3.5 3 L -3.5 3 Z" fill={colors.active} />
          </G>
        ) : null}

        {centerMessage ? (
          <SvgText
            x={CX}
            y={CY + (running ? 0 : 50)}
            fill={colors.dim}
            fontSize={11}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {centerMessage}
          </SvgText>
        ) : null}

        <Circle
          cx={CX}
          cy={CY}
          r={2}
          fill={running ? colors.active : colors.dim}
        />
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={colors.border}
          strokeWidth={1}
        />
      </Svg>

      <View
        style={[
          styles.ctx,
          { borderBottomColor: colors.borderLo },
        ]}
      >
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
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  ctx: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  ctxText: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
  },
});
