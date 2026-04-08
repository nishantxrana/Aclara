import type { ICanvasNodeData } from "./graphPresentation";

/** Combined dimming: repo-focus mute is stronger than text-filter / hover dim. */
export function graphNodeOpacityClass(data: ICanvasNodeData): string {
  if (data.focusMuted) {
    return "opacity-20";
  }
  if (data.dimmed) {
    return "opacity-40";
  }
  return "";
}
