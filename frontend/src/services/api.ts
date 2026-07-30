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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = (data as { detail?: string }).detail ?? detail;
    } catch {
      // ignore JSON parse failures on error bodies
    }
    throw new ApiError(detail, res.status);
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
