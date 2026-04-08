import { useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS, useProjects } from "@/api/insightops.api";
import { Card } from "@/components/ui/Card";
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
        <h1 className="text-xl font-semibold text-ink-primary">Choose a project</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          InsightOps loads repositories, identities, and Git permissions for one project at a time. Pick the project
          you want to audit or investigate.
        </p>
      </div>

      {urlError !== null ? (
        <p className="rounded-input border border-status-warning/35 bg-status-warning-soft px-3 py-2 text-sm text-ink-on-warning-soft">
          Could not open linked project{" "}
          <span className="font-medium">{urlError}</span>. Select a valid project below.
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

      <Card className="!p-4 text-sm text-ink-secondary shadow-panel">
        <p className="font-medium text-ink-primary">What you can do next</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>See who has access to which repositories</li>
          <li>Trace why a user has effective Git access to a repo</li>
          <li>Review identities flagged for elevated permissions</li>
        </ul>
      </Card>
    </main>
  );
}
