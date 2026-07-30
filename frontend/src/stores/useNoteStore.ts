import { create } from "zustand";

import { notesApi } from "@/services/notes";
import type { Note, NoteCreate, NoteUpdate } from "@/types";

interface NoteState {
  notes: Note[];
  activeId: number | null;
  loading: boolean;
  load: (q?: string) => Promise<void>;
  create: (payload?: NoteCreate) => Promise<Note>;
  update: (id: number, payload: NoteUpdate) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setActive: (id: number | null) => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  activeId: null,
  loading: false,
  load: async (q) => {
    set({ loading: true });
    try {
      const notes = await notesApi.list(q);
      set({ notes });
      if (get().activeId === null && notes.length > 0) {
        set({ activeId: notes[0].id });
      }
    } finally {
      set({ loading: false });
    }
  },
  create: async (payload) => {
    const note = await notesApi.create(payload ?? { title: "Untitled", markdown: "" });
    set({ notes: [note, ...get().notes], activeId: note.id });
    return note;
  },
  update: async (id, payload) => {
    const updated = await notesApi.update(id, payload);
    set({
      notes: get()
        .notes.map((n) => (n.id === id ? updated : n))
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
    });
  },
  remove: async (id) => {
    await notesApi.remove(id);
    const remaining = get().notes.filter((n) => n.id !== id);
    set({
      notes: remaining,
      activeId: get().activeId === id ? (remaining[0]?.id ?? null) : get().activeId,
    });
  },
  setActive: (id) => set({ activeId: id }),
}));
