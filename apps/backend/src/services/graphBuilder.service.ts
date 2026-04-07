import { ACL_TOKEN, GIT_PERMISSIONS } from "@/constants/azdo.constants";
import { HttpError } from "@/errors/httpError";
import { createLogger } from "@/lib/logger";
import type { DecodedAcePermissions } from "@/services/security.service";
import type { GraphService } from "@/services/graph.service";
import type { GitService } from "@/services/git.service";
import type { IdentityResolutionMaps, IdentityService } from "@/services/identity.service";
import type { SecurityService } from "@/services/security.service";
import type {
  AccessGraph,
  AccessTrace,
  GraphEdge,
  GraphNode,
  PermissionLevel,
  TraceStep,
} from "@/types/graph.types";
import type { AzdoProject, AzdoRepository } from "@/types/azdo.types";

const log = createLogger("GraphBuilder");

function repoNodeId(repoId: string): string {
  return `repo:${repoId}`;
}

function permissionEdgeLevel(decoded: DecodedAcePermissions): PermissionLevel {
  if (decoded.explicitDenyNames.length > 0) {
    return "deny";
  }
  if (decoded.explicitAllowNames.length > 0) {
    return "allow";
  }
  if (decoded.effectiveAllowNames.length > 0) {
    return "inherited-allow";
  }
  return "not-set";
}

function permissionSummary(decoded: DecodedAcePermissions): string {
  const parts = [...decoded.effectiveAllowNames];
  if (decoded.explicitDenyNames.length > 0) {
    parts.push(`deny:${decoded.explicitDenyNames.join(",")}`);
  }
  return parts.length > 0 ? parts.join(", ") : "none";
}

function nodeIdForMaps(maps: IdentityResolutionMaps, legacyOrGraphDescriptor: string): string {
  const direct = maps.index.get(legacyOrGraphDescriptor);
  if (direct !== undefined) {
    const id = direct.identity.subjectDescriptor ?? direct.identity.descriptor;
    return id;
  }
  const graph = maps.legacyToGraph.get(legacyOrGraphDescriptor);
  if (graph !== undefined) {
    return graph;
  }
  const legacy = maps.graphToLegacy.get(legacyOrGraphDescriptor);
  if (legacy !== undefined) {
    return maps.legacyToGraph.get(legacy) ?? legacy;
  }
  return legacyOrGraphDescriptor;
}

function classifyNodeType(
  graphId: string,
  groupSubjects: ReadonlySet<string>,
  userSubjects: ReadonlySet<string>
): "user" | "group" {
  if (groupSubjects.has(graphId)) {
    return "group";
  }
  if (userSubjects.has(graphId)) {
    return "user";
  }
  return "group";
}

function labelForGraphId(
  maps: IdentityResolutionMaps,
  graphId: string,
  fallback: string
): string {
  const entry = maps.index.get(graphId);
  if (entry !== undefined) {
    return (
      entry.identity.displayName ??
      entry.identity.principalName ??
      entry.identity.mailAddress ??
      fallback
    );
  }
  return fallback;
}

/**
 * Aggregates graph, Git, security, and identity services into access graphs and traces.
 */
export class GraphBuilderService {
  constructor(
    private readonly graphService: GraphService,
    private readonly securityService: SecurityService,
    private readonly gitService: GitService,
    private readonly identityService: IdentityService
  ) {}

  private async resolveProjectByName(projectName: string): Promise<AzdoProject> {
    const projects = await this.graphService.listProjects();
    const match = projects.find((p) => p.name === projectName);
    if (match === undefined) {
      throw new HttpError(`Project not found: ${projectName}`, 404);
    }
    return match;
  }

  private async resolveRepository(
    project: AzdoProject,
    repoId: string
  ): Promise<AzdoRepository> {
    const repos = await this.gitService.listRepositories(project.name);
    const repo = repos.find((r) => r.id === repoId);
    if (repo === undefined) {
      throw new HttpError(`Repository not found in project: ${repoId}`, 404);
    }
    return repo;
  }

  /**
   * Builds a project-scoped access graph: repos, identities from ACLs, membership, and permission edges.
   */
  async buildAccessGraph(projectName: string): Promise<AccessGraph> {
    log.info("graph.build.start", { projectName });
    const project = await this.resolveProjectByName(projectName);
    log.debug("graph.build.project_resolved", {
      projectId: project.id,
      projectName: project.name,
    });
    const gitNs = await this.securityService.getGitNamespace();
    if (gitNs === undefined) {
      throw new HttpError("Git security namespace is not available", 500);
    }

    log.debug("graph.build.fetch_parallel.start", {
      projectId: project.id,
    });
    const [repos, groups, users, aclRecord] = await Promise.all([
      this.gitService.listRepositories(project.name),
      this.graphService.listAllGroups(),
      this.graphService.listAllUsers(),
      this.securityService.getProjectGitAcls(project.id),
    ]);
    log.debug("graph.build.fetch_parallel.done", {
      repoCount: repos.length,
      groupCount: groups.length,
      userCount: users.length,
      aclRootTokenCount: Object.keys(aclRecord).length,
    });

    const groupSubjects = new Set(groups.map((g) => g.subjectDescriptor));
    const userSubjects = new Set(users.map((u) => u.subjectDescriptor));

    const aceDescriptors = new Set<string>();
    for (const acl of Object.values(aclRecord)) {
      for (const key of Object.keys(acl.acesDictionary)) {
        aceDescriptors.add(key);
      }
    }

    log.debug("graph.build.identity_descriptors", {
      uniqueAceDescriptors: aceDescriptors.size,
    });
    const maps =
      aceDescriptors.size > 0
        ? await this.identityService.resolveAndBuildMaps([...aceDescriptors])
        : this.identityService.buildMaps([]);

    const nodesById = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    let edgeSeq = 0;

    const addNode = (node: GraphNode): void => {
      if (!nodesById.has(node.id)) {
        nodesById.set(node.id, node);
      }
    };

    for (const repo of repos) {
      addNode({
        id: repoNodeId(repo.id),
        type: "repo",
        label: repo.name,
        metadata: {
          remoteUrl: repo.remoteUrl,
          defaultBranch: repo.defaultBranch,
        },
      });
    }

    const repoById = new Map(repos.map((r) => [r.id, r] as const));

    const subjectsNeedingMembership = new Set<string>();
    let skippedAclTokens = 0;

    for (const acl of Object.values(aclRecord)) {
      const tokenParts = acl.token.split("/");
      const repoIdFromToken =
        tokenParts.length >= 3 && tokenParts[0] === "repoV2"
          ? tokenParts[2]
          : undefined;
      if (repoIdFromToken === undefined || !repoById.has(repoIdFromToken)) {
        skippedAclTokens += 1;
        continue;
      }

      for (const ace of Object.values(acl.acesDictionary)) {
        const decoded = this.securityService.decodeAce(ace, gitNs.actions);
        const graphId = nodeIdForMaps(maps, ace.descriptor);
        const nodeType = classifyNodeType(graphId, groupSubjects, userSubjects);
        const label = labelForGraphId(maps, graphId, ace.descriptor);

        const node: GraphNode = {
          id: graphId,
          type: nodeType,
          label,
          metadata: {
            legacyDescriptor: ace.descriptor,
            explicitDenyNames: decoded.explicitDenyNames,
            explicitAllowNames: decoded.explicitAllowNames,
          },
        };
        if (decoded.isOverPrivileged) {
          node.isOverPrivileged = true;
        }
        addNode(node);

        subjectsNeedingMembership.add(graphId);

        const level = permissionEdgeLevel(decoded);
        const permission = permissionSummary(decoded);
        edgeSeq += 1;
        edges.push({
          id: `perm-${String(edgeSeq)}`,
          source: graphId,
          target: repoNodeId(repoIdFromToken),
          permission,
          level,
        });
      }
    }

    const permissionEdgeCount = edges.length;
    log.debug("graph.build.acl_to_edges", {
      skippedAclTokensNotMappedToRepoInProject: skippedAclTokens,
      permissionEdgeCount,
      nonRepoNodesAfterAces: nodesById.size - repos.length,
    });

    if (subjectsNeedingMembership.size > 0) {
      const membershipMap = await this.graphService.getCachedMembershipMap([
        ...subjectsNeedingMembership,
      ]);
      for (const [memberId, containers] of membershipMap.entries()) {
        if (!subjectsNeedingMembership.has(memberId)) {
          continue;
        }
        for (const containerId of containers) {
          addNode({
            id: containerId,
            type: "group",
            label: labelForGraphId(maps, containerId, containerId),
            metadata: { kind: "group" },
          });
          edgeSeq += 1;
          edges.push({
            id: `mem-${String(edgeSeq)}`,
            source: memberId,
            target: containerId,
            permission: "memberOf",
            level: "not-set",
          });
          subjectsNeedingMembership.add(containerId);
        }
      }

      for (const groupId of subjectsNeedingMembership) {
        if (!groupSubjects.has(groupId)) {
          continue;
        }
        const parents = await this.graphService.fetchMembershipsUp(groupId);
        for (const m of parents) {
          addNode({
            id: m.containerDescriptor,
            type: "group",
            label: labelForGraphId(maps, m.containerDescriptor, m.containerDescriptor),
            metadata: { kind: "group" },
          });
          edgeSeq += 1;
          edges.push({
            id: `gmem-${String(edgeSeq)}`,
            source: groupId,
            target: m.containerDescriptor,
            permission: "memberOf",
            level: "not-set",
          });
        }
      }
    }

    const out: AccessGraph = {
      nodes: [...nodesById.values()],
      edges,
      projectId: project.id,
      projectName: project.name,
      generatedAt: new Date().toISOString(),
    };
    log.info("graph.build.complete", {
      projectName: out.projectName,
      nodeCount: out.nodes.length,
      edgeCount: out.edges.length,
    });
    return out;
  }

  /**
   * Explains effective Git access for a user (graph subject descriptor) on a repository.
   */
  async traceAccess(
    projectName: string,
    userId: string,
    repoId: string
  ): Promise<AccessTrace> {
    log.info("trace.start", { projectName, userId, repoId });
    const project = await this.resolveProjectByName(projectName);
    await this.resolveRepository(project, repoId);

    const gitNs = await this.securityService.getGitNamespace();
    if (gitNs === undefined) {
      throw new HttpError("Git security namespace is not available", 500);
    }

    const token = ACL_TOKEN.repoGit(project.id, repoId);
    const aclRecord = await this.securityService.getAccessControlLists({
      namespaceId: gitNs.namespaceId,
      token,
      recurse: false,
    });

    const acl = aclRecord[token];
    if (acl === undefined) {
      throw new HttpError("No ACL data for repository token", 404);
    }

    const containers = await this.graphService.expandTransitiveContainers(
      [userId],
      10
    );

    const aceDescriptors = Object.keys(acl.acesDictionary);
    const toResolve = [...new Set([userId, ...containers, ...aceDescriptors])];
    const maps = await this.identityService.resolveAndBuildMaps(toResolve);

    function graphIdForAceDescriptor(
      m: IdentityResolutionMaps,
      imsDescriptor: string
    ): string {
      const fromLegacy = m.legacyToGraph.get(imsDescriptor);
      if (fromLegacy !== undefined) {
        return fromLegacy;
      }
      const entry = m.index.get(imsDescriptor);
      if (entry !== undefined) {
        return entry.identity.subjectDescriptor ?? entry.identity.descriptor;
      }
      return nodeIdForMaps(m, imsDescriptor);
    }

    const steps: TraceStep[] = [];
    let combinedAllow = 0;
    let combinedDeny = 0;

    for (const ace of Object.values(acl.acesDictionary)) {
      const graphId = graphIdForAceDescriptor(maps, ace.descriptor);
      const appliesDirectly = graphId === userId;
      const appliesViaGroup = containers.has(graphId);
      if (!appliesDirectly && !appliesViaGroup) {
        continue;
      }

      combinedAllow |= ace.allow;
      combinedDeny |= ace.deny;

      const decoded = this.securityService.decodeAce(ace, gitNs.actions);
      const subjectType: "user" | "group" = appliesDirectly ? "user" : "group";
      steps.push({
        subjectId: graphId,
        subjectType,
        subjectLabel: labelForGraphId(maps, graphId, ace.descriptor),
        permission: permissionSummary(decoded),
        level: permissionEdgeLevel(decoded),
        reason: appliesDirectly
          ? "ACE applies directly to the user"
          : "ACE applies via group membership",
      });
    }

    const finalBits = combinedAllow & ~combinedDeny;
    const effectiveNames = gitNs.actions
      .filter((a) => (finalBits & a.bit) === a.bit)
      .map((a) => a.displayName);
    const deniedNames = gitNs.actions
      .filter((a) => (combinedDeny & a.bit) === a.bit)
      .map((a) => a.displayName);

    const hasRead =
      (finalBits & GIT_PERMISSIONS.GenericRead) === GIT_PERMISSIONS.GenericRead;
    const hasContribute =
      (finalBits & GIT_PERMISSIONS.GenericContribute) ===
      GIT_PERMISSIONS.GenericContribute;

    const trace: AccessTrace = {
      userId,
      repoId,
      steps,
      effectivePermissions: effectiveNames,
      deniedPermissions: deniedNames,
      hasAccess: hasRead || hasContribute || effectiveNames.length > 0,
    };
    log.info("trace.complete", {
      projectName,
      stepCount: trace.steps.length,
      hasAccess: trace.hasAccess,
    });
    return trace;
  }
}
