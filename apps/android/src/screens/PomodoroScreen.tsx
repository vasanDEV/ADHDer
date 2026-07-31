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

type Advance = {
  ended: Session;
  next: Session;
  skipped: boolean;
};

const LABELS: {key: Kind; label: string; mins: number}[] = [
  {key: 'focus', label: 'Focus', mins: 25},
  {key: 'short_break', label: 'Short Break', mins: 5},
  {key: 'long_break', label: 'Long Break', mins: 15},
];

const HINT: Record<Kind, string> = {
  focus: 'Focus',
  short_break: 'Short break',
  long_break: 'Long break',
};

export function PomodoroScreen() {
  const [kind, setKind] = useState<Kind>('focus');
  const [session, setSession] = useState<Session | null>(null);
  const [stats, setStats] = useState({focus_sessions: 0, focus_minutes: 0});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const advancing = useRef(false);

  const refreshStats = useCallback(async () => {
    const s = await invoke<{focus_sessions: number; focus_minutes: number}>(
      'stats.dashboard',
    );
    setStats(s);
  }, []);

  const applySession = useCallback((s: Session) => {
    setSession(s);
    setKind(s.kind);
  }, []);

  const prepare = useCallback(
    async (k: Kind) => {
      const s = await invoke<Session>('pomodoro.prepare', {kind: k});
      applySession(s);
    },
    [applySession],
  );

  useEffect(() => {
    prepare('focus');
    refreshStats();
  }, [prepare, refreshStats]);

  const advanceAfterComplete = useCallback(async (id: string) => {
    if (advancing.current) return;
    advancing.current = true;
    try {
      const adv = await invoke<Advance>('pomodoro.complete_and_advance', {id});
      applySession(adv.next);
      refreshStats();
    } finally {
      advancing.current = false;
    }
  }, [applySession, refreshStats]);

  useEffect(() => {
    if (session?.status === 'running') {
      timer.current = setInterval(async () => {
        if (!session) return;
        const next = await invoke<Session>('pomodoro.tick', {
          id: session.id,
          elapsed_secs: 1,
        });
        if (next.status === 'completed') {
          if (timer.current) clearInterval(timer.current);
          await advanceAfterComplete(session.id);
        } else {
          setSession(next);
        }
      }, 1000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [session?.status, session?.id, advanceAfterComplete]);

  const remaining = session?.remaining_secs ?? 25 * 60;
  const duration = session?.duration_secs ?? 25 * 60;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = 1 - remaining / Math.max(duration, 1);

  const onPrimary = async () => {
    if (!session) return;
    if (session.status === 'running') {
      applySession(await invoke('pomodoro.pause', {id: session.id}));
    } else if (session.status === 'completed') {
      await advanceAfterComplete(session.id);
    } else {
      applySession(await invoke('pomodoro.start', {id: session.id}));
    }
  };

  const onReset = async () => {
    if (!session) return;
    applySession(await invoke('pomodoro.reset', {id: session.id}));
  };

  const onSkip = async () => {
    if (!session) return;
    const adv = await invoke<Advance>('pomodoro.skip', {id: session.id});
    applySession(adv.next);
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
      <Text style={styles.cycleHint}>25 / 5 / 15 · skip anytime</Text>

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
              ? HINT[kind]
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
              ? 'Next'
              : 'Start'}
        </Text>
      </Pressable>

      <View style={styles.secondaryRow}>
        <Pressable onPress={onSkip} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Skip</Text>
        </Pressable>
        <Pressable onPress={onReset} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Reset</Text>
        </Pressable>
      </View>

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
    marginBottom: space.sm,
  },
  tab: {paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radii.pill},
  tabActive: {backgroundColor: colors.white},
  tabText: {...type.small, color: colors.textSecondary},
  tabTextActive: {color: colors.accent, fontWeight: '600'},
  cycleHint: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: space.xxl,
  },
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
  secondaryRow: {flexDirection: 'row', gap: space.xl},
  secondaryBtn: {padding: space.md},
  secondaryText: {...type.body, color: colors.textSecondary},
  statsRow: {marginTop: 'auto', marginBottom: space.xxxl},
  stat: {...type.small, color: colors.textMuted},
});
