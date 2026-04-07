import { z } from "zod";

export const AzdoProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  state: z.string(),
  visibility: z.string(),
});

export type AzdoProject = z.infer<typeof AzdoProjectSchema>;

const AzdoGroupRawSchema = z.object({
  /** Graph list returns `descriptor`; `subjectDescriptor` may be absent. */
  subjectDescriptor: z.string().optional(),
  principalName: z.string(),
  displayName: z.string(),
  descriptor: z.string(),
  origin: z.string(),
  mailAddress: z.union([z.string(), z.null()]).optional(),
});

export const AzdoGroupSchema = AzdoGroupRawSchema.transform((g) => ({
  ...g,
  mailAddress: g.mailAddress ?? "",
}));

export type AzdoGroup = z.infer<typeof AzdoGroupSchema>;

const AzdoUserRawSchema = z.object({
  /** Graph list returns `descriptor`; `subjectDescriptor` may be absent. */
  subjectDescriptor: z.string().optional(),
  principalName: z.string(),
  displayName: z.string(),
  mailAddress: z.union([z.string(), z.null()]).optional(),
  descriptor: z.string(),
});

export const AzdoUserSchema = AzdoUserRawSchema.transform((u) => ({
  ...u,
  mailAddress: u.mailAddress ?? "",
}));

export type AzdoUser = z.infer<typeof AzdoUserSchema>;

export const AzdoMembershipSchema = z.object({
  memberDescriptor: z.string(),
  containerDescriptor: z.string(),
});

export type AzdoMembership = z.infer<typeof AzdoMembershipSchema>;

export const AzdoRepositorySchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultBranch: z.string().optional(),
  /** Single-repo GET may omit this in some tenants. */
  remoteUrl: z.string().optional(),
  project: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export type AzdoRepository = z.infer<typeof AzdoRepositorySchema>;

export const AzdoAceExtendedInfoSchema = z.object({
  effectiveAllow: z.number(),
  effectiveDeny: z.number(),
});

export type AzdoAceExtendedInfo = z.infer<typeof AzdoAceExtendedInfoSchema>;

export const AzdoAceSchema = z.object({
  descriptor: z.string(),
  allow: z.number(),
  deny: z.number(),
  extendedInfo: AzdoAceExtendedInfoSchema.optional(),
});

export type AzdoAce = z.infer<typeof AzdoAceSchema>;

export const AzdoAclSchema = z.object({
  token: z.string(),
  inheritPermissions: z.boolean(),
  acesDictionary: z.record(z.string(), AzdoAceSchema),
});

export type AzdoAcl = z.infer<typeof AzdoAclSchema>;

export const AzdoNamespaceActionSchema = z.object({
  bit: z.coerce.number(),
  name: z.string(),
  /** Some org/API versions omit this; fall back to `name` when decoding. */
  displayName: z.string().optional(),
  namespaceId: z.string().optional(),
});

export type AzdoNamespaceAction = z.infer<typeof AzdoNamespaceActionSchema>;

const AzdoSecurityNamespaceRawSchema = z.object({
  namespaceId: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  actions: z.array(AzdoNamespaceActionSchema).optional().nullable(),
});

export const AzdoSecurityNamespaceSchema = AzdoSecurityNamespaceRawSchema.transform((n) => ({
  ...n,
  actions: n.actions ?? [],
}));

export type AzdoSecurityNamespace = z.infer<typeof AzdoSecurityNamespaceSchema>;

/** Identity object returned by IMS Read Identities (used to correlate Graph vs security descriptors). */
export const AzdoIdentitySchema = z.object({
  descriptor: z.string(),
  subjectDescriptor: z.string().optional(),
  principalName: z.string().optional(),
  displayName: z.string().optional(),
  mailAddress: z.string().optional(),
});

export type AzdoIdentity = z.infer<typeof AzdoIdentitySchema>;

export const AzdoIdentitiesResponseSchema = z.object({
  value: z.array(AzdoIdentitySchema),
  count: z.number().optional(),
});

export type AzdoIdentitiesResponse = z.infer<typeof AzdoIdentitiesResponseSchema>;
