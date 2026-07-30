// Minimal typed fetch wrapper around the local REST API.
//
// In development, requests use same-origin relative paths so they flow through
// the Vite dev proxy (see vite.config.ts). In a production/packaged build there
// is no proxy — the frontend is served from the WebView2 origin
// (tauri.localhost) — so we must call the backend at its absolute local URL.
//
// Override with VITE_API_BASE_URL at build time if the backend port changes.
const BASE = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8756");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Optional global hook so the UI can surface failures (e.g. as a toast) without
// every caller needing to handle errors. Registered once by the app shell.
type ApiErrorListener = (error: Error, context: { method: string; path: string }) => void;
let errorListener: ApiErrorListener | null = null;

export function setApiErrorListener(listener: ApiErrorListener | null): void {
  errorListener = listener;
}

function reportError(error: Error, method: string, path: string): void {
  // Always log to the console (visible in WebView2 devtools) …
  console.error(`[api] ${method} ${path} failed:`, error);
  // … and notify the UI listener, if any.
  try {
    errorListener?.(error, { method, path });
  } catch {
    // never let error reporting throw
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch throws only on network-level failures (e.g. backend not running).
    const err = new ApiError(
      `Cannot reach the backend at ${BASE || "the dev proxy"}. Is it running?`,
      0,
    );
    reportError(err, method, path);
    throw err;
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = (data as { detail?: string }).detail ?? detail;
    } catch {
      // ignore JSON parse failures on error bodies
    }
    const err = new ApiError(detail, res.status);
    reportError(err, method, path);
    throw err;
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
