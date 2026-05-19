import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import * as fusion from './src/sensors/fusion';
import { PaletteProvider } from './src/ui/theme/PaletteContext';
import MainScreen from './src/ui/screens/MainScreen';

export default function App() {
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    fusion.start().catch((e) => console.warn('[fusion] start feilet:', e));
    return () => {
      fusion.stop();
    };
  }, []);

  return (
    <PaletteProvider>
      <SafeAreaView style={styles.safe}>
        <MainScreen
          audioReady={audioReady}
          onAudioReady={() => setAudioReady(true)}
        />
      </SafeAreaView>
    </PaletteProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
});
