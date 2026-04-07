import { useMemo, useState } from "react";

import { useRepos, useUsers } from "@/api/insightops.api";
import { useVisualizerStore } from "@/stores/visualizer.store";

export function Sidebar(): JSX.Element {
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const selectedUserId = useVisualizerStore((s) => s.selectedUserId);
  const selectedRepoId = useVisualizerStore((s) => s.selectedRepoId);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);

  const [userQuery, setUserQuery] = useState("");
  const [repoQuery, setRepoQuery] = useState("");

  const usersQuery = useUsers(selectedProjectName);
  const reposQuery = useRepos(selectedProjectName);

  const filteredUsers = useMemo(() => {
    const list = usersQuery.data ?? [];
    const q = userQuery.trim().toLowerCase();
    if (q.length === 0) {
      return list;
    }
    return list.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.principalName?.toLowerCase().includes(q) ?? false)
    );
  }, [usersQuery.data, userQuery]);

  const filteredRepos = useMemo(() => {
    const list = reposQuery.data ?? [];
    const q = repoQuery.trim().toLowerCase();
    if (q.length === 0) {
      return list;
    }
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [reposQuery.data, repoQuery]);

  if (selectedProjectName === null) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-r border-surface-light bg-surface-light/30">
        <div className="border-b border-surface-light px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Explorer
          </h2>
        </div>
        <p className="p-4 text-sm text-slate-500">Choose a project in the header.</p>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-surface-light bg-surface-light/30">
      <div className="border-b border-surface-light px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Explorer
        </h2>
        <p className="mt-0.5 truncate text-sm text-slate-200" title={selectedProjectName}>
          {selectedProjectName}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3">
        <section className="flex min-h-0 flex-1 flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase text-slate-500">
            Users
          </label>
          <input
            className="rounded border border-surface-light bg-surface px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none"
            onChange={(e) => {
              setUserQuery(e.target.value);
            }}
            placeholder="Search users…"
            type="search"
            value={userQuery}
          />
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
            {usersQuery.isPending ? (
              <li className="h-8 animate-pulse rounded bg-surface-light/80" />
            ) : null}
            {usersQuery.isError ? (
              <li className="text-xs text-red-400">{usersQuery.error.message}</li>
            ) : null}
            {filteredUsers.map((u) => {
              const active = selectedUserId === u.id;
              return (
                <li key={u.id}>
                  <button
                    className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                      active
                        ? "bg-primary/25 text-slate-50"
                        : "text-slate-300 hover:bg-surface-light"
                    }`}
                    onClick={() => {
                      setSelectedUser(selectedUserId === u.id ? null : u.id);
                    }}
                    type="button"
                  >
                    <span className="block truncate font-medium">{u.displayName}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-2 border-t border-surface-light pt-3">
          <label className="text-[11px] font-semibold uppercase text-slate-500">
            Repositories
          </label>
          <input
            className="rounded border border-surface-light bg-surface px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none"
            onChange={(e) => {
              setRepoQuery(e.target.value);
            }}
            placeholder="Search repos…"
            type="search"
            value={repoQuery}
          />
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
            {reposQuery.isPending ? (
              <li className="h-8 animate-pulse rounded bg-surface-light/80" />
            ) : null}
            {reposQuery.isError ? (
              <li className="text-xs text-red-400">{reposQuery.error.message}</li>
            ) : null}
            {filteredRepos.map((r) => {
              const active = selectedRepoId === r.id;
              return (
                <li key={r.id}>
                  <button
                    className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                      active
                        ? "bg-primary/25 text-slate-50"
                        : "text-slate-300 hover:bg-surface-light"
                    }`}
                    onClick={() => {
                      setSelectedRepo(selectedRepoId === r.id ? null : r.id);
                    }}
                    type="button"
                  >
                    <span className="block truncate font-medium">{r.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </aside>
  );
}
