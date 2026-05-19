import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';

import {
  initAudioSession,
  start,
  stop,
  subscribe,
} from './src/audio/engine';
import * as fusion from './src/sensors/fusion';
import * as phase from './src/audio/phase';
import SensorPanel from './src/ui/components/SensorPanel';
import RecorderBar from './src/ui/components/RecorderBar';
import EventLogStrip from './src/ui/components/EventLogStrip';

const KEEP_AWAKE_TAG = 'bridge-audio';

export default function App() {
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [currentPhase, setCurrentPhase] = useState<phase.Phase>('idle');

  useEffect(() => {
    try {
      initAudioSession();
      setReady(true);
    } catch (e) {
      console.warn('[audio] init feilet:', e);
    }

    fusion.start().catch((e) => console.warn('[fusion] start feilet:', e));

    const appSub = AppState.addEventListener('change', (s) => setAppState(s));
    const engineSub = subscribe((r) => setRunning(r));
    const phaseSub = phase.subscribe((p) => setCurrentPhase(p));
    return () => {
      appSub.remove();
      engineSub();
      phaseSub();
      fusion.stop();
    };
  }, []);

  const onPress = async () => {
    if (running) {
      await stop();
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } else {
      await start();
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.topbar}>
        <Text style={styles.sysId}>NST-7</Text>
        <Text style={styles.iteration}>iter 4</Text>
      </View>

      <SensorPanel />
      <RecorderBar />
      <EventLogStrip />

      <View style={styles.center}>
        <Pressable
          onPress={onPress}
          disabled={!ready}
          style={[
            styles.btn,
            running && styles.btnRunning,
            !ready && styles.btnDisabled,
          ]}
        >
          <Text
            style={[
              styles.btnText,
              running && styles.btnTextRunning,
              !ready && styles.btnTextDisabled,
            ]}
          >
            {ready ? (running ? 'Stop' : 'Start') : 'Init…'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta}>lag 0–3 · modulert</Text>
        <Text
          style={[
            styles.meta,
            running && currentPhase === 'active' && styles.metaActive,
          ]}
        >
          {running ? `audio · ${currentPhase}` : 'audio · off'}
        </Text>
        <Text style={styles.meta}>{appState}</Text>
      </View>
    </View>
  );
}

const C = {
  bg: '#0a0d14',
  surface: '#0f1420',
  border: '#18222e',
  text: '#8aa0b8',
  sub: '#2e3f52',
  dim: '#18242e',
  nominal: '#186040',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: 60,
    paddingBottom: 32,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  sysId: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 3,
    color: C.sub,
  },
  iteration: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 2,
    color: C.sub,
    textTransform: 'uppercase',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  btn: {
    paddingVertical: 18,
    paddingHorizontal: 56,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    minWidth: 240,
    alignItems: 'center',
  },
  btnRunning: {
    borderColor: C.nominal,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 4,
    color: C.text,
    textTransform: 'uppercase',
  },
  btnTextRunning: {
    color: C.nominal,
  },
  btnTextDisabled: {
    color: C.sub,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.dim,
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  meta: {
    fontSize: 10,
    color: C.sub,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  metaActive: {
    color: C.nominal,
  },
});
