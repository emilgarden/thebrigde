import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  RobotoCondensed_400Regular,
  RobotoCondensed_500Medium,
  RobotoCondensed_700Bold,
} from '@expo-google-fonts/roboto-condensed';
import {
  RobotoMono_400Regular,
  RobotoMono_500Medium,
} from '@expo-google-fonts/roboto-mono';
import { useFonts } from 'expo-font';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import * as fusion from './src/sensors/fusion';
import { PaletteProvider } from './src/ui/theme/PaletteContext';
import MainScreen from './src/ui/screens/MainScreen';

export default function App() {
  const [audioReady, setAudioReady] = useState(false);
  const [fontsLoaded] = useFonts({
    RobotoCondensed_400Regular,
    RobotoCondensed_500Medium,
    RobotoCondensed_700Bold,
    RobotoMono_400Regular,
    RobotoMono_500Medium,
  });

  useEffect(() => {
    fusion.start().catch((e) => console.warn('[fusion] start feilet:', e));
    return () => {
      fusion.stop();
    };
  }, []);

  if (!fontsLoaded) {
    return <View style={styles.safe} />;
  }

  return (
    <SafeAreaProvider>
      <PaletteProvider>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <MainScreen
            audioReady={audioReady}
            onAudioReady={() => setAudioReady(true)}
          />
        </SafeAreaView>
      </PaletteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
});
