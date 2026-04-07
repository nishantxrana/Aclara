import { useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS, useProjects } from "@/api/insightops.api";
import { uxEvent } from "@/lib/uxTelemetry";
import { useVisualizerStore } from "@/stores/visualizer.store";

import { NoProjectMessage } from "./EmptyStates";
import { ProjectPicker } from "./ProjectPicker";

/**
 * Full-width first step after connect: choose project before the investigation shell.
 */
export function ProjectEntryScreen(): JSX.Element {
  const queryClient = useQueryClient();
  const projectsQuery = useProjects();
  const setSelectedProject = useVisualizerStore((s) => s.setSelectedProject);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);
  const setWorkspaceView = useVisualizerStore((s) => s.setWorkspaceView);
  const recentProjects = useVisualizerStore((s) => s.recentProjects);
  const urlError = useVisualizerStore((s) => s.urlProjectResolveError);
  const hydratedName = useVisualizerStore((s) => s.selectedProjectName);
  const hydratedId = useVisualizerStore((s) => s.selectedProject);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Choose a project</h1>
        <p className="mt-2 text-sm text-slate-400">
          InsightOps loads repositories, identities, and Git permissions for one project at a time. Pick the project
          you want to audit or investigate.
        </p>
      </div>

      {urlError !== null ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Could not open linked project{" "}
          <span className="font-medium text-amber-50">{urlError}</span>. Select a valid project below.
        </p>
      ) : null}

      <div className="space-y-3">
        <ProjectPicker
          error={projectsQuery.error ?? null}
          isLoading={projectsQuery.isPending}
          onRetry={() => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
          }}
          onSelect={(id, name) => {
            if (name !== null && name.length > 0) {
              uxEvent("project_selected", { phase: "entry", hasId: id !== null });
            }
            setSelectedProject(id, name);
            setSelectedUser(null);
            setSelectedRepo(null);
            setWorkspaceView("overview");
          }}
          projects={projectsQuery.data ?? []}
          recentProjects={recentProjects}
          selectedProjectId={hydratedId}
          selectedProjectName={hydratedName}
          variant="hero"
        />
        <NoProjectMessage />
      </div>

      <div className="rounded-lg border border-surface-light bg-surface-light/20 p-4 text-sm text-slate-400">
        <p className="font-medium text-slate-300">What you can do next</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>See who has access to which repositories</li>
          <li>Trace why a user has effective Git access to a repo</li>
          <li>Review identities flagged for elevated permissions</li>
        </ul>
      </div>
    </main>
  );
}
