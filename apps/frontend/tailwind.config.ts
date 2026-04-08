import type { Config } from "tailwindcss";

import { colors as ds } from "./src/theme/designTokens";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: ds.bg.page,
        canvas: ds.bg.canvas,
        panel: {
          DEFAULT: ds.bg.panel,
          subtle: ds.bg.panelSubtle,
          muted: ds.bg.panelMuted,
        },
        ink: {
          primary: ds.text.primary,
          secondary: ds.text.secondary,
          tertiary: ds.text.tertiary,
          inverse: ds.text.inverse,
        },
        line: {
          soft: ds.border.soft,
          DEFAULT: ds.border.default,
          strong: ds.border.strong,
        },
        brand: {
          primary: ds.brand.primary,
          hover: ds.brand.primaryHover,
          soft: ds.brand.primarySoft,
          selection: ds.brand.selection,
          "selection-soft": ds.brand.selectionSoft,
          secondary: ds.brand.secondary,
          "secondary-soft": ds.brand.secondarySoft,
        },
        node: {
          user: ds.data.blue,
          group: ds.data.violet,
          repo: ds.data.teal,
        },
        status: {
          allow: ds.status.success,
          deny: ds.status.danger,
          inherited: ds.data.slate,
          success: ds.status.success,
          "success-soft": ds.status.successSoft,
          warning: ds.status.warning,
          "warning-soft": ds.status.warningSoft,
          danger: ds.status.danger,
          "danger-soft": ds.status.dangerSoft,
          info: ds.status.info,
          "info-soft": ds.status.infoSoft,
        },
        /** @deprecated Use semantic `page` / `panel` — kept for gradual migration */
        surface: {
          DEFAULT: ds.bg.panelMuted,
          light: ds.bg.panelSubtle,
        },
        /** @deprecated Use `brand.primary` */
        primary: ds.brand.primary,
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif",
        ],
        mono: [
          '"SFMono-Regular"',
          '"JetBrains Mono"',
          "ui-monospace",
          "monospace",
        ],
      },
      fontSize: {
        label: ["0.6875rem", { lineHeight: "1.3", fontWeight: "500" }],
      },
      boxShadow: {
        panel: "var(--shadow-panel-sm)",
        "panel-md": "var(--shadow-panel-md)",
        "panel-lg": "var(--shadow-panel-lg)",
      },
      borderRadius: {
        panel: "var(--radius-panel)",
        input: "var(--radius-input)",
      },
      transitionDuration: {
        fast: "120ms",
        standard: "180ms",
        slow: "260ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        emphasis: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
