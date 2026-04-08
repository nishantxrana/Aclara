import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-ink-inverse shadow-panel hover:bg-brand-hover disabled:opacity-40",
  secondary:
    "border border-line-default bg-panel text-ink-primary hover:bg-panel-subtle disabled:opacity-40",
  ghost:
    "text-ink-secondary hover:bg-brand-primary/10 hover:text-ink-primary disabled:opacity-40",
  danger:
    "border border-status-danger/35 text-status-danger hover:bg-status-danger-soft disabled:opacity-40",
  icon:
    "p-1 text-ink-tertiary hover:bg-panel-muted hover:text-ink-primary disabled:opacity-40",
};

/**
 * Design-system button: primary / secondary / ghost / danger / icon.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", type = "button", ...props },
  ref
) {
  const sizeClass =
    variant === "icon"
      ? "rounded-input"
      : "rounded-input px-3 py-2 text-sm font-medium";
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-page ${sizeClass} ${variantClass[variant]} ${className}`}
      type={type}
      {...props}
    />
  );
});
