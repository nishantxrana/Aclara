# UX validation checklist (InsightOps)

Use this after UX changes to confirm behavior matches the improvement plan.

## Instrumentation

Structured logs use `ux.*` events via `uxEvent()` in `apps/frontend/src/lib/uxTelemetry.ts`. In development, watch the browser console / logger output for:

- `ux.overview.task_launch` — overview task cards and primary CTA
- `ux.graph.view_mode` — summary / path / advanced
- `ux.graph.text_filter_mode` — highlight / contextual / hide
- `ux.graph.over_privileged_toggle`
- `ux.trace.step_pin` — pinned trace step for graph path highlight

## Keyboard & accessibility

- **Project picker** (`ProjectPicker`): open with button, type to filter, ArrowUp/ArrowDown to move, Enter to select, Escape to close. Verify `aria-expanded`, `aria-controls`, and listbox labeling.
- **Trace steps**: each step is a `<button>`; Tab reaches steps; Enter/Space activates (pin) same as click.
- **Filter bar**: graph mode and text-filter mode buttons expose `aria-pressed` where applicable.

## Deep link & recovery

- Load workspace with valid `?project=` → project resolves to canonical id after project list loads.
- Invalid `?project=` → `urlProjectResolveError` and recovery UI (banner / messaging) without silent failure.

## Large graph smoke

- With a large project: switch **Summary** vs **Advanced**; confirm layout completes and the canvas remains responsive.
- Pan/zoom, then change graph mode: first change refits; subsequent changes with same node count reuse saved viewport for that project (see `graphViewportByProject`).

## Trace ↔ graph

- Complete a user + repo trace; hover and click trace steps; path nodes and edges emphasize; other edges fade.
- Clear trace selection clears pinned/hover step highlights.
