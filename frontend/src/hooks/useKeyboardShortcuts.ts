import { useEffect } from "react";

export interface ShortcutHandlers {
  onNewTask?: () => void;
  onNewNote?: () => void;
  onSave?: () => void;
  onToggleTimer?: () => void;
  onSearch?: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

/** Global keyboard shortcuts described in the spec (Ctrl+N, Space, etc.). */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handlers.onNewNote?.();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handlers.onNewTask?.();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handlers.onSave?.();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "f") {
        e.preventDefault();
        handlers.onSearch?.();
        return;
      }
      // Space toggles the timer only when not typing into a field.
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        e.preventDefault();
        handlers.onToggleTimer?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
