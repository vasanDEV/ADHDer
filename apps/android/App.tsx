import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, StyleSheet, Text, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RootNavigator} from './src/navigation/RootNavigator';
import {initCore, isUsingMockCore} from './src/bridge/adhder';
import {colors, type} from './src/theme/tokens';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initCore().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.bootText}>ADHDer</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        {isUsingMockCore() ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Running UI mock — build Rust native lib for offline SQLite core
            </Text>
          </View>
        ) : null}
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 12,
  },
  bootText: {...type.heading, color: colors.text},
  banner: {
    backgroundColor: colors.accentSoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  bannerText: {...type.caption, color: colors.accent, textAlign: 'center'},
});

export default App;
