/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * When `"true"` in dev, the over-privilege banner shows mock entities if the graph has none.
   */
  readonly VITE_DEV_OVERPRIV_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
