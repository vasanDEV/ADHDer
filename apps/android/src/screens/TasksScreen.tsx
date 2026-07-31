import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {invoke} from '../bridge/adhder';
import {colors, radii, space, type} from '../theme/tokens';

type Column = 'todo' | 'working' | 'finished';
type Task = {
  id: string;
  title: string;
  column: Column;
  priority: string | number;
  is_focus?: boolean;
};

const COLUMNS: {key: Column; label: string}[] = [
  {key: 'todo', label: 'To Do'},
  {key: 'working', label: 'Working'},
  {key: 'finished', label: 'Finished'},
];

const WIDTH = Dimensions.get('window').width;

function priorityColor(p: string | number) {
  const v = typeof p === 'number' ? p : String(p).toLowerCase();
  if (v === 3 || v === 'high') return colors.error;
  if (v === 2 || v === 'medium') return colors.warning;
  if (v === 1 || v === 'low') return colors.accent;
  return colors.border;
}

export function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const all = await invoke<Task[]>('tasks.list');
    setTasks(all);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    const title = draft.trim();
    if (!title) return;
    await invoke('tasks.create', {title, column: COLUMNS[index].key});
    setDraft('');
    load();
  };

  const move = async (task: Task, to: Column) => {
    await invoke('tasks.move', {id: task.id, to});
    load();
  };

  const setFocus = async (task: Task) => {
    await invoke('tasks.set_focus', {id: task.id});
    load();
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / WIDTH);
    setIndex(i);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Tasks</Text>
      <View style={styles.pills}>
        {COLUMNS.map((c, i) => (
          <Pressable
            key={c.key}
            onPress={() => {
              setIndex(i);
              listRef.current?.scrollToIndex({index: i, animated: true});
            }}
            style={[styles.pill, index === i && styles.pillActive]}>
            <Text style={[styles.pillText, index === i && styles.pillTextActive]}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={COLUMNS}
        keyExtractor={c => c.key}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({item: col}) => {
          const columnTasks = tasks.filter(t => t.column === col.key);
          return (
            <View style={{width: WIDTH, paddingHorizontal: space.xl}}>
              {columnTasks.length === 0 ? (
                <Text style={styles.empty}>Nothing here yet</Text>
              ) : (
                columnTasks.map(task => (
                  <Pressable
                    key={task.id}
                    style={styles.card}
                    onLongPress={() => setFocus(task)}>
                    <View
                      style={[
                        styles.priority,
                        {backgroundColor: priorityColor(task.priority)},
                      ]}
                    />
                    <View style={{flex: 1}}>
                      <Text style={styles.cardTitle}>{task.title}</Text>
                      {task.is_focus ? (
                        <Text style={styles.focusTag}>Current focus</Text>
                      ) : null}
                    </View>
                    <View style={styles.moves}>
                      {COLUMNS.filter(c => c.key !== col.key).map(c => (
                        <Pressable
                          key={c.key}
                          onPress={() => move(task, c.key)}
                          style={styles.moveBtn}>
                          <Text style={styles.moveText}>{c.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="New task"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          onSubmitEditing={create}
        />
        <Pressable style={styles.fab} onPress={create}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg, paddingTop: space.xxl},
  heading: {...type.heading, color: colors.text, paddingHorizontal: space.xl},
  pills: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.xl,
    marginVertical: space.lg,
  },
  pill: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  pillActive: {backgroundColor: colors.accentSoft},
  pillText: {...type.small, color: colors.textSecondary},
  pillTextActive: {color: colors.accent, fontWeight: '600'},
  empty: {...type.body, color: colors.textMuted, marginTop: space.xxl},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  priority: {width: 8, height: 8, borderRadius: 4, marginTop: 6},
  cardTitle: {...type.body, color: colors.text, fontWeight: '500'},
  focusTag: {...type.caption, color: colors.accent, marginTop: 4},
  moves: {gap: 4},
  moveBtn: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moveText: {...type.caption, color: colors.textSecondary},
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.lg,
    gap: space.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    color: colors.text,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {color: colors.white, fontSize: 28, lineHeight: 30, fontWeight: '400'},
});
