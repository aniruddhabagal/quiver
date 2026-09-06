/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. http://localhost:8010. Unset means demo mode. */
  readonly VITE_API_URL?: string
  /** WebSocket URL. Defaults to VITE_API_URL with ws scheme plus /ws. */
  readonly VITE_WS_URL?: string
}
