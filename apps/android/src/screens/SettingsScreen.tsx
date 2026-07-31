import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import {invoke, isUsingMockCore} from '../bridge/adhder';
import {colors, radii, space, type} from '../theme/tokens';

type Prefs = {
  focus_duration_secs: number;
  notifications_enabled: boolean;
  pomodoro_notifications: boolean;
};

export function SettingsScreen() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setPrefs(await invoke<Prefs>('settings.get'));
  };

  useEffect(() => {
    load();
  }, []);

  const setBool = async (key: string, value: boolean) => {
    const next = await invoke<Prefs>('settings.set', {
      key,
      value: value ? 'true' : 'false',
    });
    setPrefs(next);
  };

  const exportBackup = async () => {
    const res = await invoke<{json: string}>('settings.export');
    setMessage(`Backup ready (${res.json.length} chars). Use SAF in a later build to save.`);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Settings</Text>
      <Text style={styles.sub}>
        Core mode: {isUsingMockCore() ? 'UI mock (build Rust .so for real SQLite)' : 'Rust + SQLite'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.section}>Preferences</Text>
        <Text style={styles.rowLabel}>
          Focus length: {prefs ? Math.round(prefs.focus_duration_secs / 60) : '—'} min
        </Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Notifications</Text>
          <Switch
            value={!!prefs?.notifications_enabled}
            onValueChange={v => setBool('notifications_enabled', v)}
            trackColor={{true: colors.accent}}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Pomodoro alerts</Text>
          <Switch
            value={prefs?.pomodoro_notifications !== false}
            onValueChange={v => setBool('pomodoro_notifications', v)}
            trackColor={{true: colors.accent}}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Data</Text>
        <Pressable style={styles.btn} onPress={exportBackup}>
          <Text style={styles.btnText}>Backup / Export</Text>
        </Pressable>
        <Text style={styles.help}>
          Import validates in Rust and never wipes the DB on bad JSON.
        </Text>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: space.xxl,
    paddingHorizontal: space.xl,
  },
  heading: {...type.heading, color: colors.text},
  sub: {...type.caption, color: colors.textMuted, marginTop: space.sm, marginBottom: space.xl},
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: space.xl,
    marginBottom: space.lg,
  },
  section: {...type.title, color: colors.text, marginBottom: space.lg, fontSize: 18},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
  },
  rowLabel: {...type.body, color: colors.text},
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  btnText: {color: colors.white, fontWeight: '600'},
  help: {...type.caption, color: colors.textMuted, marginTop: space.md},
  message: {...type.small, color: colors.accent, marginTop: space.md},
});
