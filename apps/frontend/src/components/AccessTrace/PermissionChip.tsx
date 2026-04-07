import { memo } from "react";

import type { PermissionLevel } from "@/types/graph.types";

import {
  chipClassForLevel,
  permissionLevelDescription,
} from "./permissionLevelPresentation";

export interface IPermissionChipProps {
  label: string;
  level: PermissionLevel;
  /** Optional override for the native tooltip (defaults to level description). */
  title?: string;
}

export const PermissionChip = memo(function PermissionChip({
  label,
  level,
  title,
}: IPermissionChipProps): JSX.Element {
  const tip = title ?? permissionLevelDescription(level);
  return (
    <span
      className={`inline-flex max-w-full items-center rounded border px-2 py-0.5 text-[11px] font-medium ${chipClassForLevel(level)}`}
      title={tip}
    >
      <span className="truncate">{label}</span>
    </span>
  );
});
