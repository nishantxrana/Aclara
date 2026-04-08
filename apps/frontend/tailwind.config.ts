import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "rgb(var(--color-bg-page) / <alpha-value>)",
        canvas: "rgb(var(--color-bg-canvas) / <alpha-value>)",
        panel: {
          DEFAULT: "rgb(var(--color-bg-panel) / <alpha-value>)",
          subtle: "rgb(var(--color-bg-panel-subtle) / <alpha-value>)",
          muted: "rgb(var(--color-bg-panel-muted) / <alpha-value>)",
        },
        ink: {
          primary: "rgb(var(--color-ink-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-ink-secondary) / <alpha-value>)",
          tertiary: "rgb(var(--color-ink-tertiary) / <alpha-value>)",
          inverse: "rgb(var(--color-ink-inverse) / <alpha-value>)",
          "on-success-soft":
            "rgb(var(--color-foreground-on-success-soft) / <alpha-value>)",
          "on-danger-soft":
            "rgb(var(--color-foreground-on-danger-soft) / <alpha-value>)",
          "on-warning-soft":
            "rgb(var(--color-foreground-on-warning-soft) / <alpha-value>)",
          "on-info-soft": "rgb(var(--color-foreground-on-info-soft) / <alpha-value>)",
        },
        line: {
          soft: "rgb(var(--color-line-soft) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-line-default) / <alpha-value>)",
          strong: "rgb(var(--color-line-strong) / <alpha-value>)",
        },
        brand: {
          primary: "rgb(var(--color-brand-primary) / <alpha-value>)",
          hover: "rgb(var(--color-brand-primary-hover) / <alpha-value>)",
          soft: "var(--color-brand-primary-soft)",
          selection: "rgb(var(--color-brand-selection) / <alpha-value>)",
          "selection-soft": "var(--color-brand-selection-soft)",
          secondary: "rgb(var(--color-brand-secondary) / <alpha-value>)",
          "secondary-soft": "var(--color-brand-secondary-soft)",
        },
        node: {
          user: "rgb(var(--color-node-user) / <alpha-value>)",
          group: "rgb(var(--color-node-group) / <alpha-value>)",
          repo: "rgb(var(--color-node-repo) / <alpha-value>)",
        },
        status: {
          allow: "rgb(var(--color-status-success) / <alpha-value>)",
          deny: "rgb(var(--color-status-danger) / <alpha-value>)",
          inherited: "rgb(var(--color-data-slate) / <alpha-value>)",
          success: "rgb(var(--color-status-success) / <alpha-value>)",
          "success-soft": "var(--color-status-success-soft)",
          warning: "rgb(var(--color-status-warning) / <alpha-value>)",
          "warning-soft": "var(--color-status-warning-soft)",
          danger: "rgb(var(--color-status-danger) / <alpha-value>)",
          "danger-soft": "var(--color-status-danger-soft)",
          info: "rgb(var(--color-status-info) / <alpha-value>)",
          "info-soft": "var(--color-status-info-soft)",
        },
        /** @deprecated Use semantic `page` / `panel` — kept for gradual migration */
        surface: {
          DEFAULT: "rgb(var(--color-bg-panel-muted) / <alpha-value>)",
          light: "rgb(var(--color-bg-panel-subtle) / <alpha-value>)",
        },
        /** @deprecated Use `brand.primary` */
        primary: "rgb(var(--color-brand-primary) / <alpha-value>)",
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
