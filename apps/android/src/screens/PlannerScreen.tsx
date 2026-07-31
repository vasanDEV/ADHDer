import React, {useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {invoke} from '../bridge/adhder';
import {colors, radii, space, type} from '../theme/tokens';

type Item = {
  id: string;
  title: string;
  start_time?: string | null;
  end_time?: string | null;
};

export function PlannerScreen() {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState('');
  const [sheetOpen, setSheetOpen] = useState(true);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), {weekStartsOn: 0});
    const end = endOfWeek(endOfMonth(cursor), {weekStartsOn: 0});
    return eachDayOfInterval({start, end});
  }, [cursor]);

  const dateKey = format(selected, 'yyyy-MM-dd');

  useEffect(() => {
    (async () => {
      const list = await invoke<Item[]>('planner.list', {date: dateKey});
      setItems(list);
    })();
  }, [dateKey]);

  const addItem = async () => {
    const title = draft.trim();
    if (!title) return;
    await invoke('planner.create', {date: dateKey, title});
    setDraft('');
    setItems(await invoke('planner.list', {date: dateKey}));
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => setCursor(d => addMonths(d, -1))}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{format(cursor, 'MMMM yyyy')}</Text>
        <Pressable onPress={() => setCursor(d => addMonths(d, 1))}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map(day => {
          const inMonth = isSameMonth(day, cursor);
          const selectedDay = isSameDay(day, selected);
          return (
            <Pressable
              key={day.toISOString()}
              style={styles.dayCell}
              onPress={() => {
                setSelected(day);
                setSheetOpen(true);
              }}>
              <View style={[styles.dayInner, selectedDay && styles.daySelected]}>
                <Text
                  style={[
                    styles.dayText,
                    !inMonth && styles.dayMuted,
                    selectedDay && styles.dayTextSelected,
                  ]}>
                  {format(day, 'd')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {sheetOpen ? (
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{format(selected, 'EEEE, MMM d')}</Text>
          <ScrollView style={{maxHeight: 180}}>
            {items.length === 0 ? (
              <Text style={styles.empty}>No plans for this day</Text>
            ) : (
              items.map(item => (
                <View key={item.id} style={styles.agendaRow}>
                  <Text style={styles.agendaTime}>
                    {item.start_time ?? '—'}
                  </Text>
                  <Text style={styles.agendaTitle}>{item.title}</Text>
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Add agenda item"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              onSubmitEditing={addItem}
            />
            <Pressable style={styles.addBtn} onPress={addItem}>
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg, paddingTop: space.xxl},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    marginBottom: space.lg,
  },
  month: {...type.heading, color: colors.text},
  nav: {fontSize: 28, color: colors.accent, paddingHorizontal: space.md},
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
  },
  weekDay: {
    width: `${100 / 7}%` as any,
    textAlign: 'center',
    ...type.caption,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space.lg,
  },
  dayCell: {width: `${100 / 7}%` as any, aspectRatio: 1, padding: 2},
  dayInner: {
    flex: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {backgroundColor: colors.accent},
  dayText: {...type.body, color: colors.text},
  dayMuted: {color: colors.textMuted},
  dayTextSelected: {color: colors.white, fontWeight: '600'},
  sheet: {
    marginTop: 'auto',
    backgroundColor: colors.surfaceSoft,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: space.xl,
    minHeight: 260,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: space.lg,
  },
  sheetTitle: {...type.title, color: colors.text, marginBottom: space.md},
  empty: {...type.body, color: colors.textMuted},
  agendaRow: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  agendaTime: {...type.small, color: colors.accent, width: 48},
  agendaTitle: {...type.body, color: colors.text, flex: 1},
  composer: {flexDirection: 'row', gap: space.sm, marginTop: space.lg},
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  addText: {color: colors.white, fontWeight: '600'},
});
