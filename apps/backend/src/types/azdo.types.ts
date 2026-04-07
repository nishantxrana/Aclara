import { z } from "zod";

export const AzdoProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  state: z.string(),
  visibility: z.string(),
});

export type AzdoProject = z.infer<typeof AzdoProjectSchema>;

export const AzdoGroupSchema = z.object({
  subjectDescriptor: z.string(),
  principalName: z.string(),
  displayName: z.string(),
  descriptor: z.string(),
  origin: z.string(),
});

export type AzdoGroup = z.infer<typeof AzdoGroupSchema>;

export const AzdoUserSchema = z.object({
  subjectDescriptor: z.string(),
  principalName: z.string(),
  displayName: z.string(),
  mailAddress: z.string(),
  descriptor: z.string(),
});

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
  remoteUrl: z.string(),
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
  bit: z.number(),
  name: z.string(),
  displayName: z.string(),
});

export type AzdoNamespaceAction = z.infer<typeof AzdoNamespaceActionSchema>;

export const AzdoSecurityNamespaceSchema = z.object({
  namespaceId: z.string(),
  name: z.string(),
  actions: z.array(AzdoNamespaceActionSchema),
});

export type AzdoSecurityNamespace = z.infer<typeof AzdoSecurityNamespaceSchema>;
