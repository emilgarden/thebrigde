/**
 * MainScreen — primærskjerm (OpenBridge / IEC 62288).
 *
 * Layout-tokens fra bridge-ux-v7.html, baseline iPhone 13 mini (375×812).
 * Rekkefølge: topbar → bearing → event-logg → instrumenter → start/stopp.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  initAudioSession,
  isRunning,
  start,
  stop,
  subscribe as subscribeEngine,
} from '../../audio/engine';
import * as fusion from '../../sensors/fusion';
import { FusedState } from '../../sensors/types';
import { usePalette } from '../theme/PaletteContext';
import {
  BEARING_PAD_BOTTOM,
  BEARING_PAD_TOP,
  HORIZONTAL_PAD,
  LOG_MIN_HEIGHT,
  TOGGLE_PAD_BOTTOM,
  TOGGLE_PAD_TOP,
  TOPBAR_PAD_BOTTOM,
  TOPBAR_PAD_TOP,
  bearingSizeForWidth,
} from '../theme/openBridgeLayout';
import { fonts } from '../theme/typography';
import BearingDisplay from '../components/BearingDisplay';
import EventLogPanel from '../components/EventLogPanel';
import InstrumentPanel, {
  InstrumentStatus,
} from '../components/InstrumentPanel';
import StatusIndicator, { IndicatorState } from '../components/StatusIndicator';
import SystemMenu from '../components/SystemMenu';

const KEEP_AWAKE_TAG = 'bridge-audio';
const LOG_ROWS = 2;

function fmt(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function magStatus(dev: number): InstrumentStatus {
  if (dev > 40) return 'alarm';
  if (dev > 15) return 'warn';
  if (dev > 0) return 'hi';
  return 'idle';
}

function baroStatus(dalt: number): InstrumentStatus {
  if (Math.abs(dalt) > 1.5) return 'warn';
  return 'hi';
}

function motionStatus(i: number): InstrumentStatus {
  if (i > 0.7) return 'warn';
  if (i > 0.05) return 'hi';
  return 'idle';
}

function speedStatus(kmh: number): InstrumentStatus {
  if (kmh > 50) return 'warn';
  if (kmh > 1) return 'hi';
  return 'idle';
}

interface MainScreenProps {
  audioReady: boolean;
  onAudioReady: () => void;
}

export default function MainScreen({
  audioReady,
  onAudioReady,
}: MainScreenProps): React.JSX.Element {
  const { colors } = usePalette();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const bearingSize = bearingSizeForWidth(screenWidth);

  const [running, setRunning] = useState(isRunning());
  const [menuOpen, setMenuOpen] = useState(false);
  const [s, setS] = useState<FusedState>(fusion.getState());

  useEffect(() => {
    if (!audioReady) {
      try {
        initAudioSession();
        onAudioReady();
      } catch (e) {
        console.warn('[audio] init feilet:', e);
      }
    }
    return subscribeEngine(setRunning);
  }, [audioReady, onAudioReady]);

  useEffect(() => {
    return fusion.subscribe(setS);
  }, []);

  const gpsState: IndicatorState = useMemo(() => {
    if (s.permissions.location === 'denied') return 'err';
    if (!s.hasGpsFix) return 'err';
    return 'ok';
  }, [s.permissions.location, s.hasGpsFix]);

  const magState: IndicatorState = useMemo(() => {
    if (s.calibrating) return 'warn';
    if (s.magBaseline === null) return 'warn';
    return 'ok';
  }, [s.calibrating, s.magBaseline]);

  const audioState: IndicatorState = running ? 'ok' : 'idle';

  const magFill = Math.min(1, s.magDeviation / 80);
  const baroFill = Math.min(1, Math.abs(s.altitudeDelta) / 5);
  const motionFill = s.motionIntensity;
  const speedFill = Math.min(1, s.speedKmh / 80);

  const onToggle = async () => {
    if (running) {
      await stop();
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } else {
      await start();
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style="light" />

      <View
        style={[styles.topbar, { borderBottomColor: colors.border }]}
      >
        <Text style={[styles.sysId, { color: colors.sub }]}>NST-7</Text>
        <View style={styles.indRow}>
          <StatusIndicator label="GPS" state={gpsState} />
          <StatusIndicator label="Mag" state={magState} />
          <StatusIndicator label="Audio" state={audioState} />
        </View>
        <Pressable
          onPress={() => setMenuOpen((o) => !o)}
          hitSlop={8}
          accessibilityLabel="System menu"
        >
          <Text
            style={[
              styles.settingsBtn,
              { color: menuOpen ? colors.text : colors.sub },
            ]}
          >
            ⚙
          </Text>
        </Pressable>
      </View>

      <SystemMenu visible={menuOpen} />

      <View style={styles.body}>
        <View style={styles.bearingBlock}>
          <BearingDisplay
            running={running}
            heading={s.heading}
            objectCount={0}
            size={bearingSize}
            onPress={audioReady ? onToggle : undefined}
          />
        </View>

        <View style={styles.eventLogSlot}>
          <EventLogPanel maxRows={LOG_ROWS} />
        </View>

        <View
          style={[
            styles.instruments,
            { backgroundColor: colors.borderLo },
          ]}
        >
          <View style={styles.instrCol}>
            <InstrumentPanel
              label="Magnetometer"
              value={fmt(s.mag.magnitude, 1)}
              unit="µT"
              status={magStatus(s.magDeviation)}
              barFill={magFill}
            />
            <InstrumentPanel
              label="Motion"
              value={fmt(s.accel.magnitude, 1)}
              unit="m/s²"
              status={motionStatus(s.motionIntensity)}
              barFill={motionFill}
            />
          </View>
          <View style={styles.instrCol}>
            <InstrumentPanel
              label="Barometer"
              value={fmt(s.baro.pressure, 1)}
              unit="hPa"
              status={baroStatus(s.altitudeDelta)}
              barFill={baroFill}
            />
            <InstrumentPanel
              label="Speed"
              value={fmt(s.speedKmh, 0)}
              unit="km/h"
              status={speedStatus(s.speedKmh)}
              barFill={speedFill}
              speedScale
            />
          </View>
        </View>

        <View
          style={[
            styles.toggleSection,
            {
              paddingBottom: Math.max(TOGGLE_PAD_BOTTOM, insets.bottom + 8),
            },
          ]}
        >
          <Pressable
            onPress={onToggle}
            disabled={!audioReady}
            style={[
              styles.toggle,
              {
                backgroundColor: colors.surface,
                borderColor: running ? colors.nominal : colors.border,
                opacity: audioReady ? 1 : 0.4,
              },
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color: running ? colors.nominal : colors.text,
                },
              ]}
            >
              {!audioReady ? 'Init…' : running ? 'Stop' : 'Start'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: TOPBAR_PAD_TOP,
    paddingBottom: TOPBAR_PAD_BOTTOM,
    borderBottomWidth: 1,
  },
  sysId: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  indRow: {
    flexDirection: 'row',
    gap: 5,
  },
  settingsBtn: {
    fontSize: 14,
    padding: 4,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bearingBlock: {
    paddingTop: BEARING_PAD_TOP,
    paddingBottom: BEARING_PAD_BOTTOM,
  },
  eventLogSlot: {
    flex: 1,
    minHeight: LOG_MIN_HEIGHT,
  },
  instruments: {
    flexDirection: 'row',
    gap: 1,
  },
  instrCol: {
    flex: 1,
    gap: 1,
  },
  toggleSection: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: TOGGLE_PAD_TOP,
  },
  toggle: {
    width: '100%',
    paddingVertical: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
