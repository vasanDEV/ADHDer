import { api } from "@/services/api";
import type { Note, NoteCreate, NoteUpdate } from "@/types";

export const notesApi = {
  list: (q?: string) => api.get<Note[]>(`/api/notes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  create: (payload: NoteCreate) => api.post<Note>("/api/notes", payload),
  update: (id: number, payload: NoteUpdate) => api.patch<Note>(`/api/notes/${id}`, payload),
  remove: (id: number) => api.del<void>(`/api/notes/${id}`),
};
