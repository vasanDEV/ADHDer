import {
  Badge,
  Caption1,
  Input,
  makeStyles,
  Text,
  tokens,
} from "@fluentui/react-components";
import { SearchRegular } from "@fluentui/react-icons";
import { formatDistanceToNow } from "date-fns";
import { forwardRef } from "react";

import type { Note } from "@/types";

const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: "10px", height: "100%", minHeight: 0 },
  list: { display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", flex: 1 },
  item: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "10px",
    borderRadius: tokens.borderRadiusMedium,
    cursor: "pointer",
    border: `1px solid transparent`,
    ":hover": { backgroundColor: tokens.colorNeutralBackground2Hover },
  },
  active: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
  },
  title: { fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { color: tokens.colorNeutralForeground3 },
  tags: { display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" },
  empty: { color: tokens.colorNeutralForeground4, padding: "12px 0", textAlign: "center" },
});

interface NoteListProps {
  notes: Note[];
  activeId: number | null;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (id: number) => void;
}

export const NoteList = forwardRef<HTMLInputElement, NoteListProps>(function NoteList(
  { notes, activeId, search, onSearch, onSelect },
  searchRef,
) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Input
        ref={searchRef}
        contentBefore={<SearchRegular />}
        placeholder="Search notes..."
        value={search}
        onChange={(_, d) => onSearch(d.value)}
      />
      <div className={styles.list}>
        {notes.length === 0 && <div className={styles.empty}>No notes yet.</div>}
        {notes.map((note) => (
          <div
            key={note.id}
            className={`${styles.item} ${note.id === activeId ? styles.active : ""}`}
            onClick={() => onSelect(note.id)}
          >
            <Text className={styles.title}>{note.title || "Untitled"}</Text>
            <Caption1 className={styles.meta}>
              {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </Caption1>
            {note.tags.length > 0 && (
              <div className={styles.tags}>
                {note.tags.map((t) => (
                  <Badge key={t} size="small" appearance="tint" color="informative">
                    #{t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
