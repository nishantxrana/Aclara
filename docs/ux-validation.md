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
- **Access trace panel**: with user + repo selected, confirm the **Summary** block updates and reads clearly; path steps show `presentationPermission` text (not raw comma dumps).

## Canvas nodes & labels

- Nodes show **primary** title + optional **secondary** line (email / principal / default branch); hover the card to see full tooltip including graph id.
- **Users** blue accent, **groups** violet, **repos** teal (left border + type label colors); selection rings use brand violet where applicable.

## Swim lanes & layout

- Top **Users / Groups / Repositories** lane legend is visible; node columns align left → center → right for those types.
- Dagre still orders vertically within each lane.

## Edges

- **Membership** edges: dashed gray, “Member of” label on hover or when trace path highlights that edge.
- **Permission** edges: green allow, red deny, lighter green inherited, **amber** when `isElevated`; labels show on hover, trace path highlight, or when both user and repo are selected and the edge touches that repo.

## Repo focus (summary / path modes)

- Select a **repository** (without Advanced mode): identities not connected to that repo’s permission edges are strongly muted (~80% fade). **Advanced** mode disables that muting.
- Selecting a **user** as well expands the highlighted set to membership ancestors and trace subjects.

## Interaction

- Nodes are not draggable; zoom limits ~0.12–2×; double-click does not zoom.
- First graph load or filter change that changes node count refits the view (`fitView` with short duration where supported).
