export const API_VERSION = "7.1";
export const GRAPH_API_VERSION = "7.1-preview.1";
export const ENTITLEMENT_API_VERSION = "7.1-preview.2";

export const GIT_NAMESPACE_ID = "2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87";
export const PROJECT_NAMESPACE_ID = "52d39943-cb85-4d7f-8fa8-c6baac873819";

export const GIT_PERMISSIONS = {
  Administer: 1,
  GenericRead: 2,
  GenericContribute: 4,
  ForcePush: 8,
  CreateBranch: 16,
  CreateTag: 32,
  ManageNote: 64,
  PolicyExempt: 128,
  CreateRepository: 256,
  DeleteRepository: 512,
  RenameRepository: 1024,
  EditPolicies: 2048,
  RemoveOthersLocks: 4096,
  ManagePermissions: 8192,
  PullRequestContribute: 16384,
  PullRequestBypassPolicy: 32768,
} as const;

export type GitPermissionName = keyof typeof GIT_PERMISSIONS;

export const OVER_PRIVILEGED_BITS = [
  GIT_PERMISSIONS.Administer,
  GIT_PERMISSIONS.ForcePush,
  GIT_PERMISSIONS.ManagePermissions,
  GIT_PERMISSIONS.PullRequestBypassPolicy,
];

export const ACL_TOKEN = {
  projectGit: (projectId: string) => `repoV2/${projectId}`,
  repoGit: (projectId: string, repoId: string) =>
    `repoV2/${projectId}/${repoId}`,
};
