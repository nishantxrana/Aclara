import type { ICanvasNodeData } from "./graphPresentation";

/** Selection / path / inspector rings — canvas uses light `ring-offset-canvas`. */
export function graphNodeBorderClass(data: ICanvasNodeData): string {
  if (data.selected) {
    return "ring-2 ring-brand-selection ring-offset-2 ring-offset-canvas";
  }
  if (data.inspectorActive === true) {
    return "ring-2 ring-brand-primary ring-offset-2 ring-offset-canvas";
  }
  if (data.pathHighlight === true) {
    return "ring-2 ring-brand-primary/75 ring-offset-1 ring-offset-canvas";
  }
  return "border border-line-default";
}

export function graphNodeElevatedClass(isOverPrivileged: boolean): string {
  return isOverPrivileged ? "ring-1 ring-status-warning/90" : "";
}
