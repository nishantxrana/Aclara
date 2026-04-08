import type { HTMLAttributes, ReactNode } from "react";

export type CalloutTone = "warning" | "danger" | "info" | "success";

const toneClass: Record<CalloutTone, string> = {
  warning: "border-status-warning/35 bg-status-warning-soft text-ink-primary",
  danger: "border-status-danger/35 bg-status-danger-soft text-ink-primary",
  info: "border-brand-primary/25 bg-brand-soft text-ink-primary",
  success: "border-status-success/35 bg-status-success-soft text-ink-primary",
};

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone: CalloutTone;
  readonly title?: string;
  readonly children: ReactNode;
}

/**
 * Tinted callout / alert surface (risk, info, errors).
 */
export function Callout(props: CalloutProps): JSX.Element {
  const { tone, title, children, className = "", ...rest } = props;
  return (
    <div
      className={`rounded-panel border px-3 py-2 text-sm ${toneClass[tone]} ${className}`}
      {...rest}
    >
      {title !== undefined ? <p className="font-medium">{title}</p> : null}
      <div className={title !== undefined ? "mt-1" : ""}>{children}</div>
    </div>
  );
}
