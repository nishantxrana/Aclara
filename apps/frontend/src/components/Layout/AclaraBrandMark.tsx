import { ACLARA_BRAND_ICON_SRC } from "@/components/Layout/brandAssets";

export type AclaraBrandMarkProps = {
  /** When true, only the logo image is shown (uses meaningful alt text). */
  readonly iconOnly?: boolean;
  readonly className?: string;
  readonly imgClassName?: string;
};

/**
 * Horizontal brand row: icon + "Aclara" label, or icon-only when `iconOnly` is set.
 */
export function AclaraBrandMark(props: AclaraBrandMarkProps): JSX.Element {
  const { iconOnly = false, className = "", imgClassName = "" } = props;
  const img = (
    <img
      src={ACLARA_BRAND_ICON_SRC}
      alt={iconOnly ? "Aclara" : ""}
      aria-hidden={iconOnly ? undefined : true}
      className={`h-8 w-8 shrink-0 object-contain ${imgClassName}`}
      width={32}
      height={32}
    />
  );

  if (iconOnly) {
    return <div className={`inline-flex items-center ${className}`}>{img}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {img}
      <span className="text-lg font-semibold tracking-tight text-brand-primary">Aclara</span>
    </div>
  );
}
