import {
  Button,
  Input,
  makeStyles,
  Tab,
  TabList,
} from "@fluentui/react-components";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { KanbanColumn } from "@/components/tasks/KanbanColumn";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import type { TaskDragItem } from "@/components/tasks/dnd";
import { Page } from "@/components/layout/Page";
import { useTaskStore } from "@/stores/useTaskStore";
import { useUiStore } from "@/stores/useUiStore";
import type { Task, TaskCreate, TaskStatus } from "@/types";

const useStyles = makeStyles({
  toolbar: { display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" },
  search: { minWidth: "220px" },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    height: "100%",
    minHeight: 0,
    marginTop: "16px",
    "@media (max-width: 900px)": { gridTemplateColumns: "1fr" },
  },
});

type FilterKey = "all" | "today" | "tomorrow" | "overdue" | "completed";

const COLUMNS: { status: TaskStatus; title: string; emptyLabel: string }[] = [
  { status: "todo", title: "To Do", emptyLabel: "No tasks for today." },
  { status: "in_progress", title: "Currently Working", emptyLabel: "Nothing in progress." },
  { status: "done", title: "Finished", emptyLabel: "Nothing finished yet." },
];

function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function TasksPage() {
  const styles = useStyles();
  const { tasks, load, create, update, move, remove } = useTaskStore();
  const { newTaskNonce, focusSearchNonce } = useUiStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, [load]);

  // Global "new task" shortcut.
  useEffect(() => {
    if (newTaskNonce > 0) {
      setEditing(null);
      setDialogOpen(true);
    }
  }, [newTaskNonce]);

  useEffect(() => {
    if (focusSearchNonce > 0) searchRef.current?.focus();
  }, [focusSearchNonce]);

  const filtered = useMemo(() => {
    const today = isoDate(0);
    const tomorrow = isoDate(1);
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q) {
        const haystack = `${t.title} ${t.description ?? ""} ${t.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      switch (filter) {
        case "today":
          return t.due_date === today || t.planner_date === today;
        case "tomorrow":
          return t.due_date === tomorrow || t.planner_date === tomorrow;
        case "overdue":
          return !t.completed && t.due_date !== null && t.due_date < today;
        case "completed":
          return t.completed;
        default:
          return true;
      }
    });
  }, [tasks, search, filter]);

  const byStatus = (status: TaskStatus) =>
    filtered.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const handleDrop = (item: TaskDragItem, status: TaskStatus, index: number) => {
    void move(item.id, status, index);
  };

  const submit = (payload: TaskCreate) => {
    if (editing) {
      void update(editing.id, payload);
    } else {
      void create(payload);
    }
  };

  return (
    <Page
      title="Tasks"
      subtitle="Drag cards between columns to update their status."
      actions={
        <Button
          appearance="primary"
          icon={<Plus size={16} strokeWidth={2} />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          New task
        </Button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className={styles.toolbar}>
          <Input
            ref={searchRef}
            className={styles.search}
            appearance="filled-darker"
            contentBefore={<Search size={15} strokeWidth={1.75} />}
            placeholder="Search tasks..."
            value={search}
            onChange={(_, d) => setSearch(d.value)}
          />
          <TabList
            selectedValue={filter}
            onTabSelect={(_, d) => setFilter(d.value as FilterKey)}
            size="small"
          >
            <Tab value="all">All</Tab>
            <Tab value="today">Today</Tab>
            <Tab value="tomorrow">Tomorrow</Tab>
            <Tab value="overdue">Overdue</Tab>
            <Tab value="completed">Completed</Tab>
          </TabList>
        </div>

        <div className={styles.board}>
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              title={col.title}
              emptyLabel={col.emptyLabel}
              tasks={byStatus(col.status)}
              onEdit={(t) => {
                setEditing(t);
                setDialogOpen(true);
              }}
              onDelete={(id) => void remove(id)}
              onDropInColumn={handleDrop}
            />
          ))}
        </div>
      </div>

      <TaskDialog
        open={dialogOpen}
        task={editing}
        onOpenChange={setDialogOpen}
        onSubmit={submit}
      />
    </Page>
  );
}
