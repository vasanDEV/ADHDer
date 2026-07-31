import React, {useEffect, useState} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {invoke} from '../bridge/adhder';
import {colors, radii, space, type} from '../theme/tokens';

type Note = {
  id: string;
  title: string;
  content: string;
  pinned?: boolean;
  updated_at: string;
};

export function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = async () => {
    setNotes(await invoke<Note[]>('notes.list'));
  };

  useEffect(() => {
    load();
  }, []);

  const open = (note: Note) => {
    setActive(note);
    setTitle(note.title);
    // Store opaque rich-text JSON; show a plain editable buffer for v0.1.
    try {
      const parsed = JSON.parse(note.content);
      setBody(parsed.plain ?? note.content);
    } catch {
      setBody(note.content);
    }
  };

  const create = async () => {
    const note = await invoke<Note>('notes.create', {title: 'Untitled'});
    await load();
    open(note);
  };

  const save = async () => {
    if (!active) return;
    const content = JSON.stringify({
      type: 'doc',
      plain: body,
      marks: [], // Bold/Italic/etc. toolbar lands in a follow-up; format stays rich_text
    });
    await invoke('notes.update', {id: active.id, title, content});
    await load();
  };

  if (active) {
    return (
      <View style={styles.root}>
        <View style={styles.editorBar}>
          <Pressable
            onPress={() => {
              save();
              setActive(null);
            }}>
            <Text style={styles.back}>‹ Notes</Text>
          </Pressable>
          <Pressable onPress={save}>
            <Text style={styles.save}>Done</Text>
          </Pressable>
        </View>
        <View style={styles.toolbar}>
          {['B', 'I', 'U', '•', '1.', '☑', '▦'].map(t => (
            <View key={t} style={styles.tool}>
              <Text style={styles.toolText}>{t}</Text>
            </View>
          ))}
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onEndEditing={save}
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          onEndEditing={save}
          style={styles.bodyInput}
          placeholder="Start writing…"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Notes</Text>
        <Pressable style={styles.fab} onPress={create}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Rich text on Android · no Markdown</Text>
      <FlatList
        data={notes}
        keyExtractor={n => n.id}
        contentContainerStyle={{padding: space.xl, gap: space.md}}
        ListEmptyComponent={
          <Text style={styles.empty}>Capture a thought — tap +</Text>
        }
        renderItem={({item}) => (
          <Pressable style={styles.card} onPress={() => open(item)}>
            <Text style={styles.cardTitle}>{item.title || 'Untitled'}</Text>
            <Text style={styles.cardMeta} numberOfLines={2}>
              {item.pinned ? 'Pinned · ' : ''}
              Updated {new Date(item.updated_at).toLocaleString()}
            </Text>
          </Pressable>
        )}
      />
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
  },
  heading: {...type.heading, color: colors.text},
  hint: {
    ...type.caption,
    color: colors.textMuted,
    paddingHorizontal: space.xl,
    marginTop: space.sm,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {color: colors.white, fontSize: 24},
  empty: {...type.body, color: colors.textMuted, marginTop: space.xxl},
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: space.lg,
  },
  cardTitle: {...type.title, color: colors.text, fontSize: 18},
  cardMeta: {...type.caption, color: colors.textMuted, marginTop: 6},
  editorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    marginBottom: space.md,
  },
  back: {...type.body, color: colors.accent},
  save: {...type.body, color: colors.accent, fontWeight: '600'},
  toolbar: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.xl,
    marginBottom: space.md,
  },
  tool: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: {color: colors.textSecondary, fontWeight: '600'},
  titleInput: {
    ...type.heading,
    color: colors.text,
    paddingHorizontal: space.xl,
    marginBottom: space.md,
  },
  bodyInput: {
    flex: 1,
    ...type.body,
    color: colors.text,
    paddingHorizontal: space.xl,
    lineHeight: 24,
  },
});
