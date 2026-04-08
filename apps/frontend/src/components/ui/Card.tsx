import type { HTMLAttributes } from "react";

/**
 * Floating panel surface: border + optional shadow (cards, form sections).
 */
export function Card(props: HTMLAttributes<HTMLDivElement>): JSX.Element {
  const { className = "", ...rest } = props;
  return (
    <div
      className={`rounded-panel border border-line-soft bg-panel p-6 shadow-panel ${className}`}
      {...rest}
    />
  );
}
