import {NativeModules, Platform} from 'react-native';

type AdhderNativeModule = {
  initialize: () => Promise<string>;
  invoke: (command: string, payloadJson: string) => Promise<string>;
};

export type AdhderError = {code: string; message: string};
export type AdhderResult<T> = {ok: true; data: T} | {ok: false; error: AdhderError};

const native: AdhderNativeModule | undefined = NativeModules.AdhderCore;

let initialized = false;
let useMock = !native;

/** Lightweight in-memory mock so UI can run before the Rust .so is built. */
const mockDb: {
  tasks: any[];
  notes: any[];
  planner: any[];
  session: any | null;
  prefs: Record<string, any>;
  stats: {focus_sessions: number; focus_minutes: number; focus_score: number; tasks_finished: number};
} = {
  tasks: [
    {
      id: 'demo-1',
      title: 'Properties of Convolution',
      notes: '',
      column: 'working',
      priority: 'high',
      is_focus: true,
      due_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      position: 1,
    },
  ],
  notes: [
    {
      id: 'note-1',
      title: 'Study Plan',
      content: '{"type":"doc"}',
      format: 'rich_text',
      pinned: true,
      folder_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  planner: [
    {
      id: 'p1',
      date: new Date().toISOString().slice(0, 10),
      title: 'Properties of Convolution',
      notes: '',
      start_time: '09:00',
      end_time: '09:25',
      task_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  session: null,
  prefs: {
    focus_duration_secs: 1500,
    short_break_secs: 300,
    long_break_secs: 900,
    notifications_enabled: false,
    pomodoro_notifications: true,
  },
  stats: {focus_sessions: 6, focus_minutes: 150, focus_score: 75, tasks_finished: 2},
};

function mockInvoke(command: string, payload: any): any {
  switch (command) {
    case 'ping':
      return {pong: true, version: '0.1.0-mock'};
    case 'tasks.list': {
      const list = [...mockDb.tasks];
      if (payload.sort === 'due_date' || payload.sort === 'due_date_asc') {
        list.sort((a, b) =>
          (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'),
        );
      } else if (payload.sort === 'due_date_desc') {
        list.sort((a, b) =>
          (b.due_date ?? '').localeCompare(a.due_date ?? ''),
        );
      }
      return list;
    }
    case 'tasks.list_by_date':
      return mockDb.tasks.filter(t => t.due_date === payload.date);
    case 'tasks.create': {
      const t = {
        id: `t-${Date.now()}`,
        title: payload.title,
        notes: payload.notes ?? '',
        column: payload.column ?? 'todo',
        priority: payload.priority ?? 'none',
        is_focus: false,
        due_date: payload.due_date ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position: mockDb.tasks.length + 1,
      };
      mockDb.tasks.push(t);
      return t;
    }
    case 'tasks.move': {
      const t = mockDb.tasks.find(x => x.id === payload.id);
      if (t) t.column = payload.to;
      return t;
    }
    case 'tasks.set_focus': {
      mockDb.tasks.forEach(t => (t.is_focus = t.id === payload.id));
      return mockDb.tasks.find(t => t.id === payload.id) ?? null;
    }
    case 'tasks.get_focus':
      return mockDb.tasks.find(t => t.is_focus) ?? null;
    case 'tasks.delete':
      mockDb.tasks = mockDb.tasks.filter(t => t.id !== payload.id);
      return {deleted: true};
    case 'notes.list':
      return mockDb.notes;
    case 'notes.create': {
      const n = {
        id: `n-${Date.now()}`,
        title: payload.title ?? '',
        content: payload.content ?? '{"type":"doc","content":[]}',
        format: 'rich_text',
        pinned: false,
        folder_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDb.notes.unshift(n);
      return n;
    }
    case 'notes.update': {
      const n = mockDb.notes.find(x => x.id === payload.id);
      if (n) Object.assign(n, payload, {updated_at: new Date().toISOString()});
      return n;
    }
    case 'pomodoro.prepare': {
      const kind = payload.kind ?? 'focus';
      const defaults: Record<string, number> = {
        focus: 25 * 60,
        short_break: 5 * 60,
        long_break: 15 * 60,
      };
      const duration = payload.duration_secs ?? defaults[kind] ?? 1500;
      mockDb.session = {
        id: `s-${Date.now()}`,
        kind,
        duration_secs: duration,
        remaining_secs: duration,
        status: 'idle',
        task_id: payload.task_id ?? null,
        started_at: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return mockDb.session;
    }
    case 'pomodoro.start':
      if (mockDb.session) {
        mockDb.session.status = 'running';
        mockDb.session.started_at = new Date().toISOString();
      }
      return mockDb.session;
    case 'pomodoro.pause':
      if (mockDb.session) mockDb.session.status = 'paused';
      return mockDb.session;
    case 'pomodoro.tick':
      if (mockDb.session && mockDb.session.status === 'running') {
        mockDb.session.remaining_secs = Math.max(
          0,
          mockDb.session.remaining_secs - (payload.elapsed_secs ?? 1),
        );
        if (mockDb.session.remaining_secs === 0) {
          mockDb.session.status = 'completed';
          if (mockDb.session.kind === 'focus') {
            mockDb.stats.focus_sessions += 1;
          }
        }
      }
      return mockDb.session;
    case 'pomodoro.reset':
      if (mockDb.session) {
        mockDb.session.status = 'idle';
        mockDb.session.remaining_secs = mockDb.session.duration_secs;
      }
      return mockDb.session;
    case 'pomodoro.skip':
    case 'pomodoro.complete_and_advance': {
      const ended = {...mockDb.session, status: 'completed'};
      const skipped = command === 'pomodoro.skip';
      if (!skipped && ended.kind === 'focus') {
        mockDb.stats.focus_sessions += 1;
      }
      const nextKind =
        ended.kind === 'focus'
          ? 'short_break'
          : 'focus';
      const defaults: Record<string, number> = {
        focus: 25 * 60,
        short_break: 5 * 60,
        long_break: 15 * 60,
      };
      mockDb.session = {
        id: `s-${Date.now()}`,
        kind: nextKind,
        duration_secs: defaults[nextKind],
        remaining_secs: defaults[nextKind],
        status: 'idle',
        task_id: ended.task_id ?? null,
        started_at: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return {ended, next: mockDb.session, skipped};
    }
    case 'pomodoro.active':
      return mockDb.session;
    case 'planner.list':
      return mockDb.tasks
        .filter(t => t.due_date === payload.date)
        .map(t => ({
          id: t.id,
          task_id: t.id,
          date: t.due_date,
          title: t.title,
          column: t.column,
          notes: t.notes,
          start_time: null,
          end_time: null,
        }));
    case 'planner.create':
    case 'planner.schedule': {
      const t = {
        id: `t-${Date.now()}`,
        title: payload.title,
        notes: payload.notes ?? '',
        column: 'todo',
        priority: 'none',
        is_focus: false,
        due_date: payload.date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position: mockDb.tasks.length + 1,
      };
      mockDb.tasks.push(t);
      const item = {
        id: `pl-${Date.now()}`,
        date: payload.date,
        title: payload.title,
        notes: payload.notes ?? '',
        task_id: t.id,
        start_time: payload.start_time ?? null,
        end_time: payload.end_time ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDb.planner.push(item);
      return {
        task: t,
        item,
        id: t.id,
        task_id: t.id,
        title: t.title,
        date: t.due_date,
        column: t.column,
      };
    }
    case 'settings.get':
      return mockDb.prefs;
    case 'settings.set':
      mockDb.prefs[payload.key] = payload.value;
      return mockDb.prefs;
    case 'stats.dashboard':
      return mockDb.stats;
    case 'search.query':
      return [];
    default:
      throw new Error(`mock unknown command ${command}`);
  }
}

export async function initCore(): Promise<{mode: 'native' | 'mock'}> {
  if (initialized) return {mode: useMock ? 'mock' : 'native'};
  if (native && Platform.OS === 'android') {
    try {
      const raw = await native.initialize();
      const parsed = JSON.parse(raw);
      if (!parsed.ok) {
        useMock = true;
      } else {
        useMock = false;
      }
    } catch {
      useMock = true;
    }
  } else {
    useMock = true;
  }
  initialized = true;
  return {mode: useMock ? 'mock' : 'native'};
}

export async function invoke<T = any>(
  command: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  await initCore();
  if (useMock) {
    return mockInvoke(command, payload) as T;
  }
  const raw = await native!.invoke(command, JSON.stringify(payload));
  const parsed = JSON.parse(raw) as AdhderResult<T>;
  if (!parsed.ok) {
    throw new Error(parsed.error?.message ?? 'adhder error');
  }
  return parsed.data as T;
}

export function isUsingMockCore(): boolean {
  return useMock;
}
