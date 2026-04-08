/**
 * Quiet section / field label (design.json `typography.scale.label`).
 */
export function SectionLabel(props: {
  readonly children: string;
  readonly className?: string;
  readonly htmlFor?: string;
}): JSX.Element {
  const { children, className = "", htmlFor } = props;
  return (
    <p
      className={`text-label text-ink-tertiary ${className}`}
      {...(htmlFor !== undefined ? { id: `${htmlFor}-label` } : {})}
    >
      {children}
    </p>
  );
}
