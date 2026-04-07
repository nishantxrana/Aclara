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

/** Timeline dot ring + fill (Tailwind classes). */
export function timelineDotClassForLevel(level: PermissionLevel): string {
  switch (level) {
    case "allow":
      return "border-status-allow bg-status-allow/30";
    case "deny":
      return "border-status-deny bg-status-deny/30";
    case "inherited-allow":
      return "border-slate-400 bg-slate-500/25";
    case "inherited-deny":
      return "border-amber-500/80 bg-amber-500/20";
    case "not-set":
      return "border-slate-600 bg-slate-700/40";
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
      return "border-status-allow/40 bg-status-allow/15 text-emerald-200";
    case "deny":
      return "border-status-deny/40 bg-status-deny/15 text-red-200";
    case "inherited-allow":
      return "border-slate-500/50 bg-slate-600/30 text-slate-200";
    case "inherited-deny":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    case "not-set":
      return "border-slate-600 bg-slate-700/50 text-slate-400";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}
