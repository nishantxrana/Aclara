# Aclara Access Visualizer — Problem & Solution

---

## The Problem

### Context
Azure DevOps is how most engineering organizations manage code, pipelines, and deployments.
Every repository, every pipeline, every environment has an access control list. In a team
of 50+ people with dozens of repos, answering even the simplest access question becomes
a manual, error-prone investigation.

### What Makes It Painful

**1. Permissions are split across three scopes — with no unified view**
A user's effective access to a repository is the result of permissions set at the
Organization level, Project level, AND Repository level all simultaneously. Azure DevOps
has no UI that shows all three in one place.

**2. Access is almost never direct — it flows through nested group chains**
A user named Alice is rarely given access directly. She's in `Team-Frontend`, which is in
`Project Contributors`, which is in `Project Valid Users`. To know what she can do on a
specific repo, you have to manually trace every group she belongs to, recursively, until
you reach an ACL entry. In a large org this chain can be 8–10 levels deep.

**3. Inherited vs explicit permissions are invisible**
Azure DevOps allows permissions to be inherited from a parent token or explicitly set at
a child level. A deny at one level can silently override an allow inherited from above —
or vice versa. There's no indicator in the UI that shows whether a permission is explicit
or inherited without clicking into each resource individually.

**4. The APIs are fragmented and use two incompatible identity systems**
The Graph API (users, groups, memberships) uses one identifier format called
`subjectDescriptor`. The Security API (ACLs, permission bits) uses a completely different
format called `descriptor`. These two systems have no automatic join. Any tool that reads
permissions must manually resolve the mapping between them — this is undocumented behavior
that Microsoft does not surface prominently.

**5. Permissions are stored as integer bitmasks — not human-readable names**
The ACL API returns numbers like `allow: 16388`. To know what that means you need to look
up the security namespace definition, extract each bit definition, and compute which named
permissions are set. There's no direct API that returns `["GenericRead", "CreateBranch"]`.

**6. No answer to the critical audit questions**

| Question | Today's answer |
|---|---|
| Who has write access to repo X? | Manual: check each group's membership, one by one |
| Why does Alice have Administer on repo Y? | Unknown without full manual trace |
| Which users have elevated permissions (force-push, bypass policy)? | No built-in report |
| When was this access configured? | Only if the audit log was enabled and you know when to look |
| Are any groups over-privileged for this project? | No built-in detection |

---

## Who Is Affected

| Role | Pain |
|---|---|
| **DevOps Engineers** | Spend hours investigating "why does this pipeline fail with 403?" |
| **Security & Compliance** | Cannot produce access reports without manual extraction |
| **Engineering Managers** | Cannot verify that ex-employee access was fully removed |
| **Platform Admins** | Cannot detect permission drift or bloated group memberships |

---

## The Solution: Aclara Access Visualizer

### Core Idea
Pull all the raw data from the Azure DevOps APIs, do the hard work of correlating the two
identity systems, decode the bitmasks, flatten the nested group chains — and then render
the result as a **visual, interactive permission graph** that answers those questions
instantly.

### What We Build

**1. Org-First Project Selection**
The user connects with a PAT token scoped to their org. The app immediately lists every
project in the org. No hardcoded defaults. The user picks the project they want to audit.

**2. The Access Graph**
The graph has three types of nodes:
- **User nodes** — every person in the project
- **Group nodes** — every security group (including nested ones)
- **Repository nodes** — every git repo in the project

Edges represent relationships:
- User → Group: "this user is a member of this group"
- Group → Repository: "this group has these permissions on this repo"
- User → Repository: "this user has these explicit direct permissions"

Edges are color-coded: green = allow, red = deny, gray = inherited.

**3. Access Trace Engine**
Click a user + click a repo. The Access Trace Panel shows a step-by-step explanation:

```
Alice Smith
  ↳ is member of: Team-Frontend
    ↳ Team-Frontend is in: Project Contributors
      ↳ Project Contributors has ACE on repo "api-service":
          allow: GenericRead, GenericContribute, CreateBranch
  ↳ also has direct explicit ACE on "api-service":
          allow: ManagePermissions  ← ⚠ elevated permission
Effective permissions: GenericRead, GenericContribute, CreateBranch, ManagePermissions
```

**4. Over-Privilege Detection**
Any user or group with Administer, ManagePermissions, ForcePush, or PullRequestBypassPolicy
is automatically flagged with a warning badge. A filter toggle shows only flagged entities.

**5. Inherited vs Explicit Labels**
Every permission in the trace is labelled:
- `explicit` — ACE set directly on this resource's token
- `inherited` — ACE set on parent token, cascading down

---

## What We Are NOT Building (POC Scope)

- No write operations — read-only, no permission changes
- No multi-org support — one org per deployment
- No historical tracking — snapshot in time, not a changelog
- No pipeline or environment permissions — git repos only for POC
- No Azure AD / Entra integration beyond what AzDO exposes through its APIs
- No authentication system — PAT token in env variable, single-user tool

---

## How It Works Technically

```
1. User opens app → sees project list (fetched from org)
2. User selects a project
3. Backend fetches in parallel:
     a. All groups (Graph API, paginated)
     b. All users (Graph API, paginated)
     c. All repositories (Git API)
     d. All group memberships (Graph Memberships API, recursive BFS)
     e. All Git namespace ACLs scoped to project (Security ACL API, recurse=true)
4. Identity Resolver maps Graph subjectDescriptors ↔ Security ACL descriptors
5. Permission Decoder turns bitmask numbers into named permission arrays
6. Graph Builder constructs the AccessGraph (nodes + edges)
7. Frontend renders the graph with react-flow + dagre layout
8. User clicks nodes → Access Trace computed on demand
```

---

## Key Technical Constraints

| Constraint | Impact | How We Handle It |
|---|---|---|
| Two identity systems (Graph vs Security) | Can't join users to ACLs without resolution step | Identity Resolver service maps both at build time |
| Bitmask permissions | Not human readable | Constants file + decoder function |
| Pagination on all Graph APIs | Missing data if not handled | Client-level `paginate()` helper loops automatically |
| Rate limits (~200 req / 5s) | Crashes on large orgs | 100ms delay + 429 retry with backoff |
| Nested group depth (up to 10+) | Infinite loops possible | BFS with visited Set, depth cap at 10 |
| ACL inheritance | Effective permission ≠ explicit allow | Use `includeExtendedInfo=true` for effectiveAllow/Deny |

---

## Success Criteria for POC

- [ ] App connects to a real Azure DevOps org via PAT
- [ ] Shows all projects, user selects one
- [ ] Graph renders with users, groups, repos as nodes
- [ ] Clicking a user + repo shows correct access trace
- [ ] Over-privileged users are flagged visually
- [ ] Graph loads in under 10 seconds for a project with ≤50 users and ≤20 repos