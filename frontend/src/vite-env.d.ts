/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for the backend base URL in production builds. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
