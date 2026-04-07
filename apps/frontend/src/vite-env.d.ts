/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * When `"true"` in dev, the over-privilege banner shows mock entities if the graph has none.
   */
  readonly VITE_DEV_OVERPRIV_MOCK?: string;
  /**
   * Client log level: TRACE | DEBUG | INFO | WARN | ERROR.
   */
  readonly VITE_LOG_LEVEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
