/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the Subly web app (default https://web.subly.app) */
  readonly VITE_SUBLY_URL?: string
  /** "1" runs the popup against the in-memory mock server and fixture pages (npm run dev) */
  readonly VITE_SUBLY_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
