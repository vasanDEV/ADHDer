import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  Option,
  SpinButton,
  Textarea,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";

import type { Priority, Task, TaskCreate, TaskStatus } from "@/types";

interface TaskDialogProps {
  open: boolean;
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: TaskCreate) => void;
}

const EMPTY = {
  title: "",
  description: "",
  priority: "medium" as Priority,
  status: "todo" as TaskStatus,
  due_date: "",
  planner_date: "",
  estimated_pomodoros: 0,
  tags: "",
};

export function TaskDialog({ open, task, onOpenChange, onSubmit }: TaskDialogProps) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        status: task.status,
        due_date: task.due_date ?? "",
        planner_date: task.planner_date ?? "",
        estimated_pomodoros: task.estimated_pomodoros,
        tags: task.tags.join(", "),
      });
    } else {
      setForm(EMPTY);
    }
  }, [task, open]);

  const submit = () => {
    if (!form.title.trim()) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
      planner_date: form.planner_date || null,
      estimated_pomodoros: form.estimated_pomodoros,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogContent
            style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}
          >
            <Field label="Title" required>
              <Input
                autoFocus
                value={form.title}
                onChange={(_, d) => setForm((f) => ({ ...f, title: d.value }))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={form.description}
                resize="vertical"
                onChange={(_, d) => setForm((f) => ({ ...f, description: d.value }))}
              />
            </Field>
            <div style={{ display: "flex", gap: "12px" }}>
              <Field label="Priority" style={{ flex: 1 }}>
                <Dropdown
                  value={form.priority}
                  selectedOptions={[form.priority]}
                  onOptionSelect={(_, d) =>
                    setForm((f) => ({ ...f, priority: d.optionValue as Priority }))
                  }
                >
                  <Option value="low">low</Option>
                  <Option value="medium">medium</Option>
                  <Option value="high">high</Option>
                </Dropdown>
              </Field>
              <Field label="Column" style={{ flex: 1 }}>
                <Dropdown
                  value={form.status}
                  selectedOptions={[form.status]}
                  onOptionSelect={(_, d) =>
                    setForm((f) => ({ ...f, status: d.optionValue as TaskStatus }))
                  }
                >
                  <Option value="todo">To Do</Option>
                  <Option value="in_progress">Currently Working</Option>
                  <Option value="done">Finished</Option>
                </Dropdown>
              </Field>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <Field label="Due date" style={{ flex: 1 }}>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(_, d) => setForm((f) => ({ ...f, due_date: d.value }))}
                />
              </Field>
              <Field label="Estimated pomodoros" style={{ flex: 1 }}>
                <SpinButton
                  min={0}
                  value={form.estimated_pomodoros}
                  onChange={(_, d) =>
                    setForm((f) => ({
                      ...f,
                      estimated_pomodoros: d.value ?? (Number(d.displayValue) || 0),
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Tags (comma separated)">
              <Input
                value={form.tags}
                onChange={(_, d) => setForm((f) => ({ ...f, tags: d.value }))}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={submit}>
              {task ? "Save" : "Create"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
