import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {format} from 'date-fns';
import {invoke} from '../bridge/adhder';
import {colors, radii, space, type} from '../theme/tokens';

type FocusTask = {id: string; title: string} | null;
type DashStats = {
  focus_sessions: number;
  focus_minutes: number;
  focus_score: number;
};

export function DashboardScreen() {
  const [now, setNow] = useState(new Date());
  const [focus, setFocus] = useState<FocusTask>(null);
  const [stats, setStats] = useState<DashStats>({
    focus_sessions: 0,
    focus_minutes: 0,
    focus_score: 0,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [f, s] = await Promise.all([
          invoke<FocusTask>('tasks.get_focus'),
          invoke<DashStats>('stats.dashboard'),
        ]);
        setFocus(f);
        setStats(s);
      } catch {
        // calm empty state
      }
    })();
  }, []);

  const analogAngle = useMemo(() => {
    const minutes = now.getMinutes() + now.getSeconds() / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    return {hour: hours * 30, minute: minutes * 6};
  }, [now]);

  return (
    <View style={styles.root}>
      <View style={styles.clockBlock}>
        <View style={styles.analog}>
          <View
            style={[
              styles.hand,
              styles.hourHand,
              {transform: [{rotate: `${analogAngle.hour}deg`}]},
            ]}
          />
          <View
            style={[
              styles.hand,
              styles.minuteHand,
              {transform: [{rotate: `${analogAngle.minute}deg`}]},
            ]}
          />
          <View style={styles.centerDot} />
        </View>
        <Text style={styles.digital}>{format(now, 'HH:mm')}</Text>
        <Text style={styles.date}>{format(now, 'EEEE, MMMM d')}</Text>
      </View>

      <Pressable style={styles.focusCard}>
        <Text style={styles.focusLabel}>Current Focus</Text>
        <Text style={styles.focusTitle}>
          {focus?.title ?? 'Choose a task or start Pomodoro'}
        </Text>
        {focus ? <Text style={styles.focusMeta}>25:00 remaining</Text> : null}
      </Pressable>

      <View style={styles.statsRow}>
        <Stat label="Sessions" value={String(stats.focus_sessions)} />
        <Stat label="Focus" value={`${stats.focus_minutes}m`} />
        <Stat label="Score" value={`${stats.focus_score}%`} />
      </View>
    </View>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    justifyContent: 'center',
  },
  clockBlock: {alignItems: 'center', marginBottom: space.xxxl},
  analog: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  hand: {
    position: 'absolute',
    backgroundColor: colors.text,
    borderRadius: 2,
  },
  hourHand: {width: 2.5, height: 14, top: 14},
  minuteHand: {width: 1.5, height: 20, top: 8},
  centerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  digital: {...type.display, color: colors.text},
  date: {...type.body, color: colors.textSecondary, marginTop: space.sm},
  focusCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: space.xl,
    marginBottom: space.xl,
  },
  focusLabel: {...type.caption, color: colors.textMuted, marginBottom: space.sm},
  focusTitle: {...type.title, color: colors.text},
  focusMeta: {...type.small, color: colors.accent, marginTop: space.sm},
  statsRow: {flexDirection: 'row', justifyContent: 'space-between', gap: space.md},
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  statValue: {...type.title, color: colors.text},
  statLabel: {...type.caption, color: colors.textMuted, marginTop: 4},
});
