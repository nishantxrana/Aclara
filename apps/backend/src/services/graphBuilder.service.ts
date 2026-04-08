import axios from "axios";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

/** Short label for edges and trace timeline (not raw comma dumps). */
function presentationLabelForPermission(decoded: DecodedAcePermissions): string {
  if (decoded.explicitDenyNames.length > 0) {
    return `Deny: ${decoded.explicitDenyNames.join(", ")}`;
  }
  if (decoded.explicitAllowNames.length > 0) {
    if (decoded.isOverPrivileged) {
      return `Elevated allow: ${decoded.explicitAllowNames.join(", ")}`;
    }
    return `Allow: ${decoded.explicitAllowNames.join(", ")}`;
  }
  if (decoded.effectiveAllowNames.length > 0) {
    return `Inherited: ${decoded.effectiveAllowNames.join(", ")}`;
  }
  return "No effective permission";
}

function secondaryLabelForIdentity(
  maps: IdentityResolutionMaps,
  graphId: string,
  primaryLabel: string
): string | undefined {
  const entry = maps.index.get(graphId);
  if (entry === undefined) {
    return undefined;
  }
  const mail = entry.identity.mailAddress;
  const pn = entry.identity.principalName;
  if (mail !== undefined && mail.length > 0 && mail !== primaryLabel) {
    return mail;
  }
  if (pn !== undefined && pn.length > 0 && pn !== primaryLabel) {
    return pn;
  }
  return undefined;
}

function buildIdentityMetadata(
  maps: IdentityResolutionMaps,
  graphId: string,
  base: Record<string, unknown>
): Record<string, unknown> {
  const entry = maps.index.get(graphId);
  if (entry === undefined) {
    return base;
  }
  const idn = entry.identity;
  const out: Record<string, unknown> = { ...base };
  if (idn.principalName !== undefined && idn.principalName.length > 0) {
    out["principalName"] = idn.principalName;
  }
  if (idn.mailAddress !== undefined && idn.mailAddress.length > 0) {
    out["mailAddress"] = idn.mailAddress;
  }
  return out;
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

/**
 * Graph `Memberships` API requires a graph subject descriptor (`vssgp.`, `msa.`, `aad.`, …).
 * Node ids may still be legacy `Microsoft.TeamFoundation.Identity;...` when IMS omits `subjectDescriptor`.
 */
function graphSubjectForMembershipApi(
  maps: IdentityResolutionMaps,
  nodeId: string
): string | null {
  if (!nodeId.startsWith("Microsoft.")) {
    return nodeId;
  }
  const mapped = maps.legacyToGraph.get(nodeId);
  if (mapped !== undefined && mapped.length > 0) {
    return mapped;
  }
  const entry = maps.index.get(nodeId);
  const sd = entry?.identity.subjectDescriptor;
  if (sd !== undefined && sd.length > 0) {
    return sd;
  }
  return null;
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
    try {
      return await this.gitService.getRepository(project.name, repoId);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw new HttpError(`Repository not found in project: ${repoId}`, 404);
      }
      throw err;
    }
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

    const groupSubjects = new Set(
      groups.map((g) => g.subjectDescriptor ?? g.descriptor)
    );
    const userSubjects = new Set(
      users.map((u) => u.subjectDescriptor ?? u.descriptor)
    );

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
      const primary = repo.name;
      const secondary =
        repo.defaultBranch !== undefined && repo.defaultBranch.length > 0
          ? repo.defaultBranch
          : undefined;
      addNode({
        id: repoNodeId(repo.id),
        type: "repo",
        label: primary,
        primaryLabel: primary,
        ...(secondary !== undefined ? { secondaryLabel: secondary } : {}),
        metadata: {
          ...(repo.remoteUrl !== undefined && repo.remoteUrl.length > 0
            ? { remoteUrl: repo.remoteUrl }
            : {}),
          ...(repo.defaultBranch !== undefined && repo.defaultBranch.length > 0
            ? { defaultBranch: repo.defaultBranch }
            : {}),
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
        const primary = labelForGraphId(maps, graphId, ace.descriptor);
        const secondary = secondaryLabelForIdentity(maps, graphId, primary);

        const node: GraphNode = {
          id: graphId,
          type: nodeType,
          label: primary,
          primaryLabel: primary,
          ...(secondary !== undefined ? { secondaryLabel: secondary } : {}),
          metadata: buildIdentityMetadata(maps, graphId, {
            legacyDescriptor: ace.descriptor,
            explicitDenyNames: decoded.explicitDenyNames,
            explicitAllowNames: decoded.explicitAllowNames,
          }),
        };
        if (decoded.isOverPrivileged) {
          node.isOverPrivileged = true;
        }
        addNode(node);

        subjectsNeedingMembership.add(graphId);

        const level = permissionEdgeLevel(decoded);
        const permission = permissionSummary(decoded);
        const presentationLabel = presentationLabelForPermission(decoded);
        edgeSeq += 1;
        edges.push({
          id: `perm-${String(edgeSeq)}`,
          source: graphId,
          target: repoNodeId(repoIdFromToken),
          kind: "permission",
          permission,
          presentationLabel,
          level,
          ...(decoded.isOverPrivileged ? { isElevated: true } : {}),
          ...(nodeType === "user" ? { isDirect: true } : {}),
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
      const nodeIdsByApiSubject = new Map<string, string[]>();
      let skippedMembershipNoGraphSubject = 0;
      for (const nodeId of subjectsNeedingMembership) {
        const apiSubject = graphSubjectForMembershipApi(maps, nodeId);
        if (apiSubject === null) {
          skippedMembershipNoGraphSubject += 1;
          continue;
        }
        const list = nodeIdsByApiSubject.get(apiSubject) ?? [];
        list.push(nodeId);
        nodeIdsByApiSubject.set(apiSubject, list);
      }
      if (skippedMembershipNoGraphSubject > 0) {
        log.debug("graph.build.membership_skip_legacy_only", {
          skippedCount: skippedMembershipNoGraphSubject,
        });
      }

      const membershipByNodeId = new Map<string, readonly string[]>();
      for (const [apiSubject, nodeIds] of nodeIdsByApiSubject.entries()) {
        const memberships = await this.graphService.fetchMembershipsUp(apiSubject);
        const containers = memberships.map((m) => m.containerDescriptor);
        for (const nodeId of nodeIds) {
          membershipByNodeId.set(nodeId, containers);
        }
      }

      for (const [memberId, containers] of membershipByNodeId.entries()) {
        if (!subjectsNeedingMembership.has(memberId)) {
          continue;
        }
        for (const containerId of containers) {
          const gPrimary = labelForGraphId(maps, containerId, containerId);
          const gSecondary = secondaryLabelForIdentity(maps, containerId, gPrimary);
          addNode({
            id: containerId,
            type: "group",
            label: gPrimary,
            primaryLabel: gPrimary,
            ...(gSecondary !== undefined ? { secondaryLabel: gSecondary } : {}),
            metadata: buildIdentityMetadata(maps, containerId, { kind: "group" }),
          });
          edgeSeq += 1;
          edges.push({
            id: `mem-${String(edgeSeq)}`,
            source: memberId,
            target: containerId,
            kind: "membership",
            permission: "memberOf",
            presentationLabel: "Member of",
            level: "not-set",
          });
          subjectsNeedingMembership.add(containerId);
        }
      }

      for (const groupId of subjectsNeedingMembership) {
        if (!groupSubjects.has(groupId)) {
          continue;
        }
        const groupApiSubject = graphSubjectForMembershipApi(maps, groupId);
        if (groupApiSubject === null) {
          continue;
        }
        const parents = await this.graphService.fetchMembershipsUp(groupApiSubject);
        for (const m of parents) {
          const cid = m.containerDescriptor;
          const pPrimary = labelForGraphId(maps, cid, cid);
          const pSecondary = secondaryLabelForIdentity(maps, cid, pPrimary);
          addNode({
            id: cid,
            type: "group",
            label: pPrimary,
            primaryLabel: pPrimary,
            ...(pSecondary !== undefined ? { secondaryLabel: pSecondary } : {}),
            metadata: buildIdentityMetadata(maps, cid, { kind: "group" }),
          });
          edgeSeq += 1;
          edges.push({
            id: `gmem-${String(edgeSeq)}`,
            source: groupId,
            target: cid,
            kind: "membership",
            permission: "memberOf",
            presentationLabel: "Member of",
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
      const subjectLabel = labelForGraphId(maps, graphId, ace.descriptor);
      const viaGroup = appliesViaGroup && !appliesDirectly ? subjectLabel : undefined;
      steps.push({
        subjectId: graphId,
        subjectType,
        subjectLabel,
        ...(viaGroup !== undefined ? { viaGroup } : {}),
        permission: permissionSummary(decoded),
        presentationPermission: presentationLabelForPermission(decoded),
        level: permissionEdgeLevel(decoded),
        reason: appliesDirectly
          ? "This Git permission ACE is assigned directly to the user on this repository."
          : `This ACE applies to group "${subjectLabel}"; the selected user is included via group membership (up to transitive depth).`,
      });
    }

    const finalBits = combinedAllow & ~combinedDeny;
    const effectiveNames = gitNs.actions
      .filter((a) => (finalBits & a.bit) === a.bit)
      .map((a) => a.displayName ?? a.name);
    const deniedNames = gitNs.actions
      .filter((a) => (combinedDeny & a.bit) === a.bit)
      .map((a) => a.displayName ?? a.name);

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
