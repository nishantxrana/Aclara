import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        surface: {
          DEFAULT: "#1e1e2e",
          light: "#2a2a3e",
        },
        node: {
          user: "#3b82f6",
          group: "#8b5cf6",
          repo: "#10b981",
        },
        status: {
          allow: "#22c55e",
          deny: "#ef4444",
          inherited: "#6b7280",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
