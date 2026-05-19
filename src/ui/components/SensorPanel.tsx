/**
 * SensorPanel — debug-visning av FusedState i sanntid.
 *
 * Brukes i Iter 2 for å validere at sensorer fungerer.
 * Erstattes/integreres i OpenBridge MainScreen i Iter 5.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as fusion from '../../sensors/fusion';
import { FusedState } from '../../sensors/types';

const C = {
  bg: '#0a0d14',
  surface: '#0f1420',
  border: '#18222e',
  text: '#8aa0b8',
  sub: '#2e3f52',
  dim: '#18242e',
  nominal: '#186040',
  warning: '#906010',
  alarm: '#901818',
};

function fmt(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

interface RowProps {
  label: string;
  primary: string;
  secondary?: string;
  status?: 'idle' | 'hi' | 'warn' | 'alarm';
}

function Row({ label, primary, secondary, status = 'idle' }: RowProps) {
  const barColor =
    status === 'alarm'
      ? C.alarm
      : status === 'warn'
      ? C.warning
      : status === 'hi'
      ? C.nominal
      : C.dim;

  return (
    <View style={styles.row}>
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <View style={styles.rowBody}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.rowValues}>
          <Text style={styles.primary}>{primary}</Text>
          {secondary ? <Text style={styles.secondary}>{secondary}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export default function SensorPanel() {
  const [s, setS] = useState<FusedState>(fusion.getState());

  useEffect(() => {
    return fusion.subscribe(setS);
  }, []);

  const magStatus = s.magDeviation > 40 ? 'alarm' : s.magDeviation > 15 ? 'warn' : 'hi';
  const baroStatus = Math.abs(s.altitudeDelta) > 1.5 ? 'warn' : 'hi';
  const motionStatus = s.motionIntensity > 0.7 ? 'warn' : s.motionIntensity > 0.05 ? 'hi' : 'idle';
  const speedStatus = s.speedKmh > 50 ? 'warn' : s.speedKmh > 1 ? 'hi' : 'idle';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>SENSORS</Text>
        {s.calibrating ? (
          <Text style={styles.calibrating}>CALIBRATING…</Text>
        ) : null}
      </View>

      <Row
        label="Magnetometer"
        primary={`${fmt(s.mag.magnitude, 1)} µT`}
        secondary={
          s.magBaseline === null
            ? `base —`
            : `dev ${fmt(s.magDeviation, 1)} · pan ${fmt(s.magPan, 2)}`
        }
        status={magStatus}
      />

      <Row
        label="Barometer"
        primary={`${fmt(s.baro.pressure, 2)} hPa`}
        secondary={`Δ ${fmt(s.altitudeDelta, 2)} m`}
        status={baroStatus}
      />

      <Row
        label="Motion"
        primary={`${fmt(s.accel.magnitude, 2)} m/s²`}
        secondary={`i ${fmt(s.motionIntensity, 2)}`}
        status={motionStatus}
      />

      <Row
        label="Rotation"
        primary={`${fmt(s.gyro.magnitude, 2)} rad/s`}
        secondary={`i ${fmt(s.rotationIntensity, 2)} · z ${fmt(s.gyro.z, 2)}`}
        status={
          s.rotationIntensity > 0.4
            ? 'warn'
            : s.rotationIntensity > 0.1
            ? 'hi'
            : 'idle'
        }
      />

      <Row
        label="Speed"
        primary={`${fmt(s.speedKmh, 0)} km/h`}
        secondary={
          s.permissions.location !== 'granted'
            ? 'no permission'
            : s.hasGpsFix
            ? `hdg ${s.heading >= 0 ? fmt(s.heading, 0) + '°' : '—'}`
            : 'no fix'
        }
        status={speedStatus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.dim,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.sub,
  },
  calibrating: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: C.warning,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.dim,
  },
  bar: {
    width: 3,
  },
  rowBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: C.sub,
    textTransform: 'uppercase',
  },
  rowValues: {
    alignItems: 'flex-end',
  },
  primary: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    color: C.text,
  },
  secondary: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    color: C.sub,
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
