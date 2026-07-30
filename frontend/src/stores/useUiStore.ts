import { create } from "zustand";

// Lightweight "intent" bus so global keyboard shortcuts can trigger actions on
// whichever page is currently mounted. Pages watch the relevant nonce.
interface UiState {
  newTaskNonce: number;
  newNoteNonce: number;
  focusSearchNonce: number;
  saveNonce: number;
  requestNewTask: () => void;
  requestNewNote: () => void;
  requestFocusSearch: () => void;
  requestSave: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  newTaskNonce: 0,
  newNoteNonce: 0,
  focusSearchNonce: 0,
  saveNonce: 0,
  requestNewTask: () => set({ newTaskNonce: get().newTaskNonce + 1 }),
  requestNewNote: () => set({ newNoteNonce: get().newNoteNonce + 1 }),
  requestFocusSearch: () => set({ focusSearchNonce: get().focusSearchNonce + 1 }),
  requestSave: () => set({ saveNonce: get().saveNonce + 1 }),
}));
