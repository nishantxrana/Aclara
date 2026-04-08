import { AlertTriangle, FolderGit2, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { useGraph, useRepos, useUsers } from "@/api/aclara.api";
import { useOverPrivilegedNodes } from "@/hooks/useOverPrivilegedNodes";
import { layout } from "@/theme/designTokens";
import { useVisualizerStore } from "@/stores/visualizer.store";

import type { ExplorerTab } from "@/stores/visualizer.store";

function tabButtonClass(active: boolean): string {
  if (active) {
    return "bg-brand-primary/12 text-brand-primary";
  }
  return "text-ink-tertiary hover:bg-panel-muted hover:text-ink-primary";
}

export function Sidebar(): JSX.Element {
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const explorerTab = useVisualizerStore((s) => s.explorerTab);
  const setExplorerTab = useVisualizerStore((s) => s.setExplorerTab);
  const selectedUserId = useVisualizerStore((s) => s.selectedUserId);
  const selectedRepoId = useVisualizerStore((s) => s.selectedRepoId);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);
  const setInspector = useVisualizerStore((s) => s.setInspector);
  const setWorkspaceView = useVisualizerStore((s) => s.setWorkspaceView);

  const [userQuery, setUserQuery] = useState("");
  const [repoQuery, setRepoQuery] = useState("");

  const usersQuery = useUsers(selectedProjectName);
  const reposQuery = useRepos(selectedProjectName);
  const graphQuery = useGraph(selectedProjectName);
  const riskSummary = useOverPrivilegedNodes(graphQuery.data);

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
    return list.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [reposQuery.data, repoQuery]);

  const onTab = (tab: ExplorerTab) => {
    setExplorerTab(tab);
  };

  const railClass = `flex shrink-0 flex-col border-r border-line-soft bg-panel shadow-panel`;

  if (selectedProjectName === null) {
    return (
      <aside className={`${railClass}`} style={{ width: layout.explorerWidth }}>
        <div className="border-b border-line-soft px-4 py-3">
          <h2 className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">
            Explorer
          </h2>
        </div>
        <p className="p-4 text-sm text-ink-secondary">Choose a project in the header.</p>
      </aside>
    );
  }

  return (
    <aside className={railClass} style={{ width: layout.explorerWidth }}>
      <div className="border-b border-line-soft px-3 py-3">
        <h2 className="px-1 text-label font-semibold uppercase tracking-wide text-ink-tertiary">
          Explorer
        </h2>
        <p className="mt-0.5 truncate px-1 text-sm text-ink-primary" title={selectedProjectName}>
          {selectedProjectName}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-input border border-line-default bg-panel-muted/60 p-0.5">
          <button
            className={`flex items-center justify-center gap-1 rounded-md px-1 py-1.5 text-label font-semibold uppercase ${tabButtonClass(
              explorerTab === "users"
            )}`}
            onClick={() => {
              onTab("users");
            }}
            type="button"
          >
            <Users className="h-3 w-3" aria-hidden />
            Users
          </button>
          <button
            className={`flex items-center justify-center gap-1 rounded-md px-1 py-1.5 text-label font-semibold uppercase ${tabButtonClass(
              explorerTab === "repos"
            )}`}
            onClick={() => {
              onTab("repos");
            }}
            type="button"
          >
            <FolderGit2 className="h-3 w-3" aria-hidden />
            Repos
          </button>
          <button
            className={`flex items-center justify-center gap-1 rounded-md px-1 py-1.5 text-label font-semibold uppercase ${tabButtonClass(
              explorerTab === "risks"
            )}`}
            onClick={() => {
              onTab("risks");
            }}
            type="button"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Risks
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        {explorerTab === "users" ? (
          <section className="flex min-h-0 flex-1 flex-col gap-2">
            <label className="text-label font-semibold text-ink-tertiary" htmlFor="sb-user-search">
              Users
            </label>
            <input
              className="rounded-input border border-line-default bg-panel-muted/80 px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-tertiary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              id="sb-user-search"
              onChange={(e) => {
                setUserQuery(e.target.value);
              }}
              placeholder="Search users…"
              type="search"
              value={userQuery}
            />
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
              {usersQuery.isPending ? (
                <li className="h-8 animate-pulse rounded bg-panel-muted" />
              ) : null}
              {usersQuery.isError ? (
                <li className="text-xs text-status-danger">{usersQuery.error.message}</li>
              ) : null}
              {filteredUsers.map((u) => {
                const active = selectedUserId === u.id;
                return (
                  <li key={u.id}>
                    <button
                      className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                        active
                          ? "bg-brand-primary/12 font-medium text-ink-primary ring-1 ring-brand-primary/25"
                          : "text-ink-secondary hover:bg-brand-soft"
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
        ) : null}

        {explorerTab === "repos" ? (
          <section className="flex min-h-0 flex-1 flex-col gap-2">
            <label className="text-label font-semibold text-ink-tertiary" htmlFor="sb-repo-search">
              Repositories
            </label>
            <input
              className="rounded-input border border-line-default bg-panel-muted/80 px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-tertiary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              id="sb-repo-search"
              onChange={(e) => {
                setRepoQuery(e.target.value);
              }}
              placeholder="Search repos…"
              type="search"
              value={repoQuery}
            />
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
              {reposQuery.isPending ? (
                <li className="h-8 animate-pulse rounded bg-panel-muted" />
              ) : null}
              {reposQuery.isError ? (
                <li className="text-xs text-status-danger">{reposQuery.error.message}</li>
              ) : null}
              {filteredRepos.map((r) => {
                const active = selectedRepoId === r.id;
                return (
                  <li key={r.id}>
                    <button
                      className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                        active
                          ? "bg-brand-primary/12 font-medium text-ink-primary ring-1 ring-brand-primary/25"
                          : "text-ink-secondary hover:bg-brand-soft"
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
        ) : null}

        {explorerTab === "risks" ? (
          <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            <p className="text-label font-semibold text-ink-tertiary">Risky identities</p>
            <p className="text-xs text-ink-secondary">
              Users and groups flagged for sensitive Git permission bits in this snapshot.
            </p>
            {riskSummary.devMockActive ? (
              <p className="rounded-input border border-status-warning/40 bg-status-warning-soft px-2 py-1.5 text-label text-ink-on-warning-soft">
                Dev mock data is active (VITE_DEV_OVERPRIV_MOCK).
              </p>
            ) : null}
            {graphQuery.isPending ? (
              <div className="h-20 animate-pulse rounded bg-panel-muted" />
            ) : null}
            {graphQuery.isError ? (
              <p className="text-xs text-status-danger">{graphQuery.error.message}</p>
            ) : null}
            {graphQuery.isSuccess && !riskSummary.hasAny ? (
              <p className="text-xs text-ink-secondary">No flagged identities in this graph.</p>
            ) : null}
            {riskSummary.hasAny ? (
              <div className="space-y-3">
                {riskSummary.users.length > 0 ? (
                  <div>
                    <p className="text-label font-semibold text-ink-tertiary">Users</p>
                    <ul className="mt-1 space-y-1">
                      {riskSummary.users.map((u) => (
                        <li key={u.id}>
                          <button
                            className="w-full rounded-md border border-status-warning/30 bg-status-warning-soft px-2 py-1.5 text-left text-xs text-ink-on-warning-soft hover:bg-status-warning/25"
                            onClick={() => {
                              setSelectedUser(u.id);
                              setWorkspaceView("investigate");
                            }}
                            type="button"
                          >
                            <span className="block truncate font-medium">{u.label}</span>
                            <span className="mt-0.5 block truncate text-label text-ink-on-warning-soft/90">
                              {u.elevatedSummary}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {riskSummary.groups.length > 0 ? (
                  <div>
                    <p className="text-label font-semibold text-ink-tertiary">Groups</p>
                    <ul className="mt-1 space-y-1">
                      {riskSummary.groups.map((g) => (
                        <li key={g.id}>
                          <button
                            className="w-full rounded-md border border-status-warning/30 bg-status-warning-soft px-2 py-1.5 text-left text-xs text-ink-on-warning-soft hover:bg-status-warning/25"
                            onClick={() => {
                              setInspector(g.id, "group");
                              setWorkspaceView("investigate");
                            }}
                            type="button"
                          >
                            <span className="block truncate font-medium">{g.label}</span>
                            <span className="mt-0.5 block truncate text-label text-ink-on-warning-soft/90">
                              {g.elevatedSummary}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </aside>
  );
}
