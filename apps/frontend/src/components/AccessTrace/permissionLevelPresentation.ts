import type { PermissionLevel } from "@/types/graph.types";

/**
 * Short human-readable copy for native tooltips on permission levels.
 */
export function permissionLevelDescription(level: PermissionLevel): string {
  switch (level) {
    case "allow":
      return "Explicit allow on this ACE.";
    case "deny":
      return "Explicit deny on this ACE.";
    case "inherited-allow":
      return "Effective allow inherited from a parent scope.";
    case "inherited-deny":
      return "Effective deny inherited from a parent scope.";
    case "not-set":
      return "No effective permission from this path.";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

/** Timeline dot ring + fill (Tailwind classes) — light surfaces. */
export function timelineDotClassForLevel(level: PermissionLevel): string {
  switch (level) {
    case "allow":
      return "border-status-allow bg-status-success-soft";
    case "deny":
      return "border-status-deny bg-status-danger-soft";
    case "inherited-allow":
      return "border-line-strong bg-panel-muted";
    case "inherited-deny":
      return "border-status-warning bg-status-warning-soft";
    case "not-set":
      return "border-line-default bg-panel-subtle";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

/** Compact chip surface for permission labels. */
export function chipClassForLevel(level: PermissionLevel): string {
  switch (level) {
    case "allow":
      return "border-status-success/40 bg-status-success-soft text-emerald-800";
    case "deny":
      return "border-status-danger/40 bg-status-danger-soft text-red-800";
    case "inherited-allow":
      return "border-line-default bg-panel-muted text-ink-secondary";
    case "inherited-deny":
      return "border-status-warning/45 bg-status-warning-soft text-amber-900";
    case "not-set":
      return "border-line-default bg-panel-subtle text-ink-tertiary";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}
