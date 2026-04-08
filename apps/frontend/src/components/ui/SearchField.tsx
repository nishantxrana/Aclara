import type { InputHTMLAttributes, ReactNode } from "react";

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  readonly className?: string;
  readonly leading?: ReactNode;
}

/**
 * Rounded search / filter input with optional leading icon (design.json `searchField`).
 */
export function SearchField(props: SearchFieldProps): JSX.Element {
  const { className = "", leading, id, ...inputProps } = props;
  return (
    <div
      className={`flex min-h-[40px] items-center gap-2 rounded-input border border-line-default bg-panel-muted/80 px-2 py-1.5 transition-colors focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15 ${className}`}
    >
      {leading !== undefined ? <span className="shrink-0 text-ink-tertiary">{leading}</span> : null}
      <input
        className="min-w-0 flex-1 bg-transparent text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
        id={id}
        {...inputProps}
      />
    </div>
  );
}
