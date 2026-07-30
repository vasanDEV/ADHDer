import {
  Button,
  Input,
  makeStyles,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  DeleteRegular,
  DocumentSplitHintRegular,
  EyeRegular,
} from "@fluentui/react-icons";
import MDEditor from "@uiw/react-md-editor";
import { useEffect, useMemo, useRef, useState } from "react";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import { NoteList } from "@/components/notes/NoteList";
import { Page } from "@/components/layout/Page";
import { useIsDark } from "@/hooks/useIsDark";
import { useNoteStore } from "@/stores/useNoteStore";
import { useUiStore } from "@/stores/useUiStore";

const useStyles = makeStyles({
  layout: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: "16px",
    height: "100%",
    minHeight: 0,
  },
  editorPane: { display: "flex", flexDirection: "column", gap: "10px", minWidth: 0 },
  titleRow: { display: "flex", gap: "8px", alignItems: "center" },
  titleInput: { flex: 1, fontSize: "18px", fontWeight: 600 },
  editorWrap: { flex: 1, minHeight: 0, display: "flex" },
  status: { color: tokens.colorNeutralForeground3, fontSize: "12px" },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "12px",
    color: tokens.colorNeutralForeground3,
  },
});

export function NotesPage() {
  const styles = useStyles();
  const isDark = useIsDark();
  const { notes, activeId, load, create, update, remove, setActive } = useNoteStore();
  const { newNoteNonce, focusSearchNonce, saveNonce } = useUiStore();

  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [tags, setTags] = useState("");
  const [previewMode, setPreviewMode] = useState<"live" | "preview">("live");
  const [saved, setSaved] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const autosaveMs = 1200;

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId]);

  // Load the active note into the local editing buffer.
  useEffect(() => {
    if (active) {
      setTitle(active.title);
      setMarkdown(active.markdown);
      setTags(active.tags.join(", "));
      setSaved(true);
    }
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced autosave.
  useEffect(() => {
    if (!active || saved) return;
    const handle = setTimeout(() => {
      void update(active.id, {
        title: title.trim() || "Untitled",
        markdown,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }).then(() => setSaved(true));
    }, autosaveMs);
    return () => clearTimeout(handle);
  }, [title, markdown, tags, saved, active, update]);

  // Global shortcuts.
  useEffect(() => {
    if (newNoteNonce > 0) void create();
  }, [newNoteNonce]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focusSearchNonce > 0) searchRef.current?.focus();
  }, [focusSearchNonce]);
  useEffect(() => {
    if (saveNonce > 0 && active && !saved) {
      void update(active.id, { title: title.trim() || "Untitled", markdown }).then(() =>
        setSaved(true),
      );
    }
  }, [saveNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.markdown.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, search]);

  const markDirty = () => setSaved(false);

  return (
    <Page
      title="Notes"
      subtitle="Markdown notebook with live preview and autosave."
      actions={
        <Button appearance="primary" icon={<AddRegular />} onClick={() => void create()}>
          New note
        </Button>
      }
    >
      <div className={styles.layout}>
        <NoteList
          ref={searchRef}
          notes={filtered}
          activeId={activeId}
          search={search}
          onSearch={setSearch}
          onSelect={setActive}
        />

        {active ? (
          <div className={styles.editorPane}>
            <div className={styles.titleRow}>
              <Input
                className={styles.titleInput}
                appearance="underline"
                value={title}
                placeholder="Note title"
                onChange={(_, d) => {
                  setTitle(d.value);
                  markDirty();
                }}
              />
              <Button
                appearance={previewMode === "live" ? "primary" : "subtle"}
                icon={<DocumentSplitHintRegular />}
                onClick={() => setPreviewMode("live")}
              >
                Split
              </Button>
              <Button
                appearance={previewMode === "preview" ? "primary" : "subtle"}
                icon={<EyeRegular />}
                onClick={() => setPreviewMode("preview")}
              >
                Preview
              </Button>
              <Button
                appearance="subtle"
                icon={<DeleteRegular />}
                aria-label="Delete note"
                onClick={() => void remove(active.id)}
              />
            </div>

            <Input
              placeholder="tags, comma, separated"
              value={tags}
              onChange={(_, d) => {
                setTags(d.value);
                markDirty();
              }}
            />

            <div className={styles.editorWrap} data-color-mode={isDark ? "dark" : "light"}>
              <MDEditor
                value={markdown}
                height="100%"
                preview={previewMode}
                onChange={(v) => {
                  setMarkdown(v ?? "");
                  markDirty();
                }}
                previewOptions={{
                  remarkPlugins: [remarkMath],
                  rehypePlugins: [rehypeKatex],
                }}
                style={{ flex: 1 }}
              />
            </div>

            <Text className={styles.status}>{saved ? "All changes saved" : "Saving…"}</Text>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Text>Select a note or create a new one.</Text>
            <Button appearance="primary" icon={<AddRegular />} onClick={() => void create()}>
              New note
            </Button>
          </div>
        )}
      </div>
    </Page>
  );
}
