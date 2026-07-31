import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {invoke} from '../bridge/adhder';
import {colors, radii, space, type} from '../theme/tokens';

type Kind = 'focus' | 'short_break' | 'long_break';
type Session = {
  id: string;
  kind: Kind;
  duration_secs: number;
  remaining_secs: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
};

const LABELS: {key: Kind; label: string}[] = [
  {key: 'focus', label: 'Focus'},
  {key: 'short_break', label: 'Short Break'},
  {key: 'long_break', label: 'Long Break'},
];

export function PomodoroScreen() {
  const [kind, setKind] = useState<Kind>('focus');
  const [session, setSession] = useState<Session | null>(null);
  const [stats, setStats] = useState({focus_sessions: 0, focus_minutes: 0});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshStats = useCallback(async () => {
    const s = await invoke<{focus_sessions: number; focus_minutes: number}>(
      'stats.dashboard',
    );
    setStats(s);
  }, []);

  const prepare = useCallback(
    async (k: Kind) => {
      const s = await invoke<Session>('pomodoro.prepare', {kind: k});
      setSession(s);
      setKind(k);
    },
    [],
  );

  useEffect(() => {
    prepare('focus');
    refreshStats();
  }, [prepare, refreshStats]);

  useEffect(() => {
    if (session?.status === 'running') {
      timer.current = setInterval(async () => {
        if (!session) return;
        const next = await invoke<Session>('pomodoro.tick', {
          id: session.id,
          elapsed_secs: 1,
        });
        setSession(next);
        if (next.status === 'completed') {
          refreshStats();
        }
      }, 1000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [session?.status, session?.id, refreshStats]);

  const remaining = session?.remaining_secs ?? 25 * 60;
  const duration = session?.duration_secs ?? 25 * 60;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = 1 - remaining / Math.max(duration, 1);

  const onPrimary = async () => {
    if (!session) return;
    if (session.status === 'running') {
      setSession(await invoke('pomodoro.pause', {id: session.id}));
    } else if (session.status === 'completed') {
      await prepare(kind);
    } else {
      setSession(await invoke('pomodoro.start', {id: session.id}));
    }
  };

  const onReset = async () => {
    if (!session) return;
    setSession(await invoke('pomodoro.reset', {id: session.id}));
  };

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {LABELS.map(t => (
          <Pressable
            key={t.key}
            onPress={() => prepare(t.key)}
            style={[styles.tab, kind === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, kind === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.ringWrap}>
        <View style={styles.ringOuter}>
          <View
            style={[
              styles.ringProgress,
              {
                borderColor: colors.accent,
                opacity: 0.25 + progress * 0.75,
                transform: [{rotate: `${progress * 360}deg`}],
              },
            ]}
          />
          <Text style={styles.timer}>
            {mm}:{ss}
          </Text>
          <Text style={styles.timerHint}>
            {session?.status === 'running'
              ? 'Focusing'
              : session?.status === 'paused'
                ? 'Paused'
                : 'Ready'}
          </Text>
        </View>
      </View>

      <Pressable style={styles.start} onPress={onPrimary}>
        <Text style={styles.startText}>
          {session?.status === 'running'
            ? 'Pause'
            : session?.status === 'completed'
              ? 'Again'
              : 'Start'}
        </Text>
      </Pressable>
      <Pressable onPress={onReset} style={styles.reset}>
        <Text style={styles.resetText}>Reset</Text>
      </Pressable>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>
          {stats.focus_sessions} sessions · {stats.focus_minutes}m today
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: space.xxxl,
  },
  tab: {paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radii.pill},
  tabActive: {backgroundColor: colors.white},
  tabText: {...type.small, color: colors.textSecondary},
  tabTextActive: {color: colors.accent, fontWeight: '600'},
  ringWrap: {marginBottom: space.xxxl},
  ringOuter: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 6,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringProgress: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 6,
    borderTopColor: colors.accent,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  timer: {...type.display, fontSize: 56, color: colors.text},
  timerHint: {...type.small, color: colors.textMuted, marginTop: space.sm},
  start: {
    backgroundColor: colors.accent,
    paddingHorizontal: 64,
    paddingVertical: 16,
    borderRadius: radii.pill,
    marginBottom: space.lg,
  },
  startText: {...type.title, color: colors.white, fontSize: 18},
  reset: {padding: space.md},
  resetText: {...type.body, color: colors.textSecondary},
  statsRow: {marginTop: 'auto', marginBottom: space.xxxl},
  stat: {...type.small, color: colors.textMuted},
});
