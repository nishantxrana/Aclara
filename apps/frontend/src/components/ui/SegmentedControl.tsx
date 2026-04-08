import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  readonly id: T;
  readonly label: ReactNode;
  readonly title?: string;
}

export interface SegmentedControlProps<T extends string> {
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (id: T) => void;
  readonly ariaLabel: string;
  readonly className?: string;
}

/**
 * Pill / segmented toggle group (toolbar modes, tabs).
 */
export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>): JSX.Element {
  const { options, value, onChange, ariaLabel, className = "" } = props;
  return (
    <div
      aria-label={ariaLabel}
      className={`inline-flex flex-wrap items-center gap-0.5 rounded-input border border-line-default bg-panel-muted/50 p-0.5 ${className}`}
      role="group"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            aria-pressed={active}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-fast ${
              active
                ? "bg-brand-primary/15 text-brand-primary shadow-sm"
                : "text-ink-tertiary hover:bg-panel hover:text-ink-primary"
            }`}
            key={opt.id}
            onClick={() => {
              onChange(opt.id);
            }}
            title={opt.title}
            type="button"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
