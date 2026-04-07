import { ChevronDown, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import type { ProjectSummary } from "@/api/insightops.api";
import type { RecentProject } from "@/stores/visualizer.store";

export interface ProjectPickerProps {
  readonly projects: ProjectSummary[];
  readonly selectedProjectName: string | null;
  readonly selectedProjectId: string | null;
  readonly recentProjects: readonly RecentProject[];
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly onRetry?: () => void;
  readonly onSelect: (id: string | null, name: string | null) => void;
  readonly orgLabel?: string;
  readonly variant: "header" | "hero";
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function ProjectPicker(props: ProjectPickerProps): JSX.Element {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = normalize(search);
    const list = props.projects;
    if (q.length === 0) {
      return list;
    }
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q)
    );
  }, [props.projects, search]);

  const recentInList = useMemo(() => {
    const byName = new Map(props.projects.map((p) => [p.name, p] as const));
    const out: ProjectSummary[] = [];
    for (const r of props.recentProjects) {
      const p = byName.get(r.name);
      if (p !== undefined) {
        out.push(p);
      }
    }
    return out;
  }, [props.projects, props.recentProjects]);

  const displayRows = useMemo(() => {
    const q = normalize(search);
    if (q.length > 0) {
      return { showRecent: false, options: filtered };
    }
    const recentSet = new Set(recentInList.map((p) => p.name));
    const rest = props.projects.filter((p) => !recentSet.has(p.name));
    return { showRecent: recentInList.length > 0, options: [...recentInList, ...rest] };
  }, [filtered, props.projects, recentInList, search]);

  const flatOptions = displayRows.options;

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveIndex(0);
  }, [open, search, flatOptions.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent): void => {
      const el = containerRef.current;
      if (el !== null && e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  const selectProject = useCallback(
    (p: ProjectSummary | null) => {
      if (p === null) {
        props.onSelect(null, null);
      } else {
        props.onSelect(p.id, p.name);
      }
      setOpen(false);
      setSearch("");
    },
    [props]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
        setOpen(true);
        return;
      }
      if (!open) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setSearch("");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, flatOptions.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && flatOptions.length > 0) {
        e.preventDefault();
        const p = flatOptions[activeIndex];
        if (p !== undefined) {
          selectProject(p);
        }
      }
    },
    [activeIndex, flatOptions, open, selectProject]
  );

  const widthClass =
    props.variant === "hero" ? "w-full max-w-xl" : "max-w-xs min-w-[12rem] w-full sm:w-auto";

  if (props.isLoading) {
    return (
      <div className={`${widthClass} h-10 animate-pulse rounded-md bg-surface-light`} aria-busy="true" />
    );
  }

  if (props.error !== null) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${widthClass}`}>
        <p className="text-sm text-red-400">{props.error.message}</p>
        {props.onRetry !== undefined ? (
          <button
            className="rounded border border-surface-light px-2 py-1 text-xs text-slate-300 hover:bg-surface-light/40"
            onClick={props.onRetry}
            type="button"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  const selectedLabel = props.selectedProjectName ?? "";
  const inputValue = open ? search : selectedLabel;
  const activeDescendant =
    flatOptions.length > 0 && activeIndex >= 0 && activeIndex < flatOptions.length
      ? `${listboxId}-opt-${String(activeIndex)}`
      : undefined;

  return (
    <div className={`relative ${widthClass}`} ref={containerRef}>
      {props.orgLabel !== undefined && props.orgLabel.length > 0 ? (
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Org: <span className="text-slate-400">{props.orgLabel}</span>
        </p>
      ) : null}
      <div
        className={`flex items-center gap-1 rounded-md border border-surface-light bg-surface ${
          props.variant === "hero" ? "px-3 py-2.5" : "px-2 py-1.5"
        }`}
      >
        <Search aria-hidden className="h-4 w-4 shrink-0 text-slate-500" />
        <label className="sr-only" htmlFor={`${listboxId}-input`}>
          Project
        </label>
        <input
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          id={`${listboxId}-input`}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) {
              setOpen(true);
            }
          }}
          onFocus={() => {
            setOpen(true);
            if (props.selectedProjectName !== null) {
              setSearch(props.selectedProjectName);
            }
          }}
          onKeyDown={onKeyDown}
          placeholder="Search or select project…"
          ref={inputRef}
          role="combobox"
          type="text"
          value={inputValue}
        />
        <button
          aria-expanded={open}
          aria-label={open ? "Close project list" : "Open project list"}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-surface-light hover:text-slate-200"
          onClick={() => {
            setOpen((v) => !v);
            if (!open) {
              inputRef.current?.focus();
            }
          }}
          type="button"
        >
          <ChevronDown aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <ul
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-md border border-surface-light bg-surface py-1 shadow-lg"
          id={listboxId}
          role="listbox"
        >
          {displayRows.showRecent ? (
            <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500" role="presentation">
              Recent
            </li>
          ) : null}
          {flatOptions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500" role="presentation">
              No projects match.
            </li>
          ) : (
            flatOptions.map((p, i) => {
              const isActive = i === activeIndex;
              const isSelected = props.selectedProjectName === p.name;
              return (
                <li
                  aria-selected={isSelected}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    isActive ? "bg-primary/20 text-slate-50" : "text-slate-200 hover:bg-surface-light/60"
                  }`}
                  id={`${listboxId}-opt-${String(i)}`}
                  key={p.id}
                  onMouseEnter={() => {
                    setActiveIndex(i);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    selectProject(p);
                  }}
                  role="option"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{p.state}</span>
                  {isSelected ? (
                    <span className="ml-2 text-xs text-primary">✓</span>
                  ) : null}
                </li>
              );
            })
          )}
          <li className="border-t border-surface-light" role="presentation">
            <button
              className="w-full px-3 py-2 text-left text-xs text-slate-500 hover:bg-surface-light/40"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                selectProject(null);
              }}
              type="button"
            >
              Clear selection
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
