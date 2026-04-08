# Design system (InsightOps)

This document ties the product design spec in [`design.json`](../design.json) to the frontend implementation.

## Surface families

| Family | Role | Implementation |
|--------|------|----------------|
| **Page** | Atmospheric app background | `bg-page`, CSS `--color-bg-page` |
| **Canvas** | Main working area (graph, large content) | `bg-canvas`, `--color-bg-canvas` |
| **Panel** | Floating chrome: sidebar, inspector, trace, cards | `bg-panel`, `border-border-default` |
| **Brand / selection** | Primary actions vs canvas intelligence | `text-brand-primary`, `ring-brand-selection` |

## Components by area

- **Shell**: `WorkspacePage`, `AppShell`, `Header`, `ProjectContextStrip`
- **Navigation / picker**: `ProjectPicker`, `ProjectEntryScreen`
- **Explorer**: `Sidebar`
- **Toolbar / filters**: `FilterBar`, `OverPrivilegeBanner`
- **Panels**: `ProjectOverview`, `NodeInspectorPanel`, `AccessTracePanel`, `ConnectScreen`
- **Graph**: `GraphCanvas`, node components, edges, `graphColors.ts`

## Token source

- Canonical values live in [`design.json`](../design.json).
- Runtime theme values are defined in [`apps/frontend/src/theme/designTokens.ts`](../apps/frontend/src/theme/designTokens.ts) and [`apps/frontend/src/index.css`](../apps/frontend/src/index.css) (CSS variables for scrollbars, base typography, and future dark theme hooks).
- Tailwind semantic colors are wired in [`apps/frontend/tailwind.config.ts`](../apps/frontend/tailwind.config.ts).

## Consistency rules

- Use semantic utilities (`text-ink-primary`, `bg-page`, `bg-panel`, `border-line-soft`, `text-brand-primary`) instead of raw `slate-*` or hex in feature components.
- Spacing follows the 8px scale from `design.json` (`gap-3`, `p-4`, `p-6` for major regions).
- Primary actions: solid brand blue (`Button` primary). Secondary: outline or ghost. Canvas selection: `ring-brand-selection`; list/panel selection: pale `bg-brand-primary/12`.
- **Guardrails**: do not add hardcoded hex in JSX except in `theme/designTokens.ts` / `graphColors` bridges; reuse `Button`, `Card`, `SearchField`, `SegmentedControl`, `Callout` for new UI; keep graph stroke colors in `theme/graphColors.ts` aligned with tokens.

## Validation after theme changes

- Run `bun run typecheck` and `bun test` in `apps/frontend`.
- Smoke: Connect → pick project → Overview → Investigate → filter graph → select group (inspector) → user+repo trace.
- Check focus rings on inputs and primary buttons (keyboard Tab).
