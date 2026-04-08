# Aclara Access Visualizer — Complete Project Documentation

> **Tech Stack:** React + TypeScript · Node.js (Express) · Bun (package manager / runtime) · Azure DevOps REST APIs

---

## Table of Contents

1. [Problem Deep-Dive](#1-problem-deep-dive)
2. [Solution Architecture](#2-solution-architecture)
3. [Azure DevOps API Research](#3-azure-devops-api-research)
4. [Environment Variables & Credentials Setup](#4-environment-variables--credentials-setup)
5. [Project Structure](#5-project-structure)
6. [Cursor Rules — Prompt to Generate `.cursorrules`](#6-cursor-rules--prompt-to-generate-cursorrules)
7. [Master Implementation Prompt for Cursor](#7-master-implementation-prompt-for-cursor)
8. [Data Model Reference](#8-data-model-reference)
9. [API Endpoint Contract](#9-api-endpoint-contract)
10. [Frontend Component Map](#10-frontend-component-map)
11. [Known API Gotchas](#11-known-api-gotchas)

---

## 1. Problem Deep-Dive

Azure DevOps permission management is fragmented across three scopes:

| Scope | Location | Examples |
|---|---|---|
| **Organization** | `dev.azure.com/{org}` | Project Collection Admins, billing |
| **Project** | `dev.azure.com/{org}/{project}` | Contributors, Readers, Build Admins |
| **Repository** | Per-repo git namespace | Branch policies, force-push, manage permissions |

### Why It's Hard

- **Nested groups**: A user may be in `Team A` → `Contributors` → `Project Valid Users`. The *final* effective permission comes from the deepest granted bit.
- **Inheritance**: Permissions cascade unless explicitly denied at a lower level. A user can be denied `GenericContribute` at the org level but allowed it at the repo level.
- **ACL bitmasks**: Permissions are stored as integer bitmasks (`allow` / `deny`) against a security namespace. You must know the namespace ID AND the token format to resolve them.
- **Two separate identity systems**: The Graph API uses `subjectDescriptor` (stable). The Security API uses a different `descriptor` format. You must map between them.
- **No single endpoint**: There is no "give me all permissions for user X" API. You must correlate: memberships → ACLs → namespaces → tokens → resource names.

---

## 2. Solution Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TS)                 │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Graph Canvas │  │ Access Trace │  │  Audit Sidebar │ │
│  │ (react-flow) │  │   Panel      │  │                │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘ │
│         └─────────────────┴──────────────────┘          │
│                       React Query                        │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────▼───────────────────────────────┐
│                 BACKEND (Node.js + Express)               │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │               Aggregation Layer                   │  │
│  │  ┌────────────┐ ┌──────────────┐ ┌─────────────┐ │  │
│  │  │ Identity   │ │  Permissions │ │ Graph       │ │  │
│  │  │ Resolver   │ │  Resolver    │ │ Builder     │ │  │
│  │  └────────────┘ └──────────────┘ └─────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                    Azure DevOps Client                    │
└─────────────────────────┬───────────────────────────────┘
                          │ PAT Auth
┌─────────────────────────▼───────────────────────────────┐
│                 AZURE DEVOPS APIs                         │
│  Graph · Security · Git · Projects · Member Entitlements │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User selects Org + Project in UI
2. Backend fetches:
   a. All groups (Graph API)
   b. All users + entitlements (Member Entitlement API)
   c. All repositories (Git API)
   d. Group memberships recursively (Graph Memberships API)
   e. ACL entries for Git namespace (Security ACL API)
3. Identity Resolver maps subjectDescriptors ↔ security descriptors
4. Permission Resolver decodes bitmasks into named permissions
5. Graph Builder constructs: User → Group → Permission → Repo nodes
6. Frontend renders interactive graph with react-flow
7. User clicks node → Access Trace Panel explains the permission chain
```

---

## 3. Azure DevOps API Research

### 3.1 Base URLs

```
https://dev.azure.com/{organization}                  ← main API host
https://vssps.dev.azure.com/{organization}            ← Graph & identity
https://vsaex.dev.azure.com/{organization}            ← Member Entitlements
```

### 3.2 API Version

Always use `api-version=7.1` (latest stable as of 2025).

### 3.3 Authentication

All APIs use HTTP Basic Auth with a PAT token:
```
Authorization: Basic base64(":{PAT_TOKEN}")
```

### 3.4 Key API Endpoints (Mapped)

#### Projects
```
GET https://dev.azure.com/{org}/_apis/projects?api-version=7.1
→ Returns list of projects with IDs and names
```

#### Graph — List All Groups
```
GET https://vssps.dev.azure.com/{org}/_apis/graph/groups?api-version=7.1-preview.1
→ Paginated. Use x-ms-continuationtoken header for next page.
→ Returns: subjectDescriptor, principalName, displayName, descriptor
```

#### Graph — List All Users
```
GET https://vssps.dev.azure.com/{org}/_apis/graph/users?api-version=7.1-preview.1
→ Returns: subjectDescriptor, principalName, displayName, mailAddress
```

#### Graph — Group Memberships (who is in a group)
```
GET https://vssps.dev.azure.com/{org}/_apis/graph/memberships/{groupDescriptor}?direction=Down&api-version=7.1-preview.1
→ direction=Down: returns members of the group
→ direction=Up: returns groups the subject belongs to
→ Returns: memberDescriptor, containerDescriptor
```

#### Member Entitlements (users + licenses + project memberships)
```
GET https://vsaex.dev.azure.com/{org}/_apis/memberentitlements?api-version=7.1-preview.2
→ Returns full user profile, access level, project entitlements, group rules
```

#### Git Repositories
```
GET https://dev.azure.com/{org}/{project}/_apis/git/repositories?api-version=7.1
→ Returns: id, name, remoteUrl, project info
```

#### Security Namespaces (find the Git namespace ID)
```
GET https://dev.azure.com/{org}/_apis/securitynamespaces?api-version=7.1
→ Key namespace: "Git Repositories" → ID: 2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87
→ Each namespace has: namespaceId, name, actions (bitmask definitions)
```

#### ACL (Access Control Lists) — THE CORE PERMISSION API
```
GET https://dev.azure.com/{org}/_apis/accesscontrollists/{namespaceId}?token={token}&includeExtendedInfo=true&recurse=true&api-version=7.1
→ namespaceId: 2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87  (Git)
→ token format for a repo: repoV2/{projectId}/{repoId}
→ token format for a project: repoV2/{projectId}
→ Returns: ACEs with descriptor, allow (bitmask), deny (bitmask), extendedInfo (effectiveAllow, effectiveDeny)
```

#### Identity Resolution (descriptor ↔ subjectDescriptor)
```
POST https://vssps.dev.azure.com/{org}/_apis/identities?api-version=7.1
body: { descriptors: ["vssgp.xxx", "aad.yyy"] }
→ Maps security descriptors to identity objects with subjectDescriptor
```

### 3.5 Git Repository Permission Bitmask Reference

```
Namespace ID: 2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87

Bit  1    (1)     → Administer
Bit  2    (2)     → GenericRead
Bit  4    (4)     → GenericContribute
Bit  8    (8)     → ForcePush
Bit  16   (16)    → CreateBranch
Bit  32   (32)    → CreateTag
Bit  64   (64)    → ManageNote
Bit  128  (128)   → PolicyExempt
Bit  256  (256)   → CreateRepository
Bit  512  (512)   → DeleteRepository
Bit  1024 (1024)  → RenameRepository
Bit  2048 (2048)  → EditPolicies
Bit  4096 (4096)  → RemoveOthersLocks
Bit  8192 (8192)  → ManagePermissions
Bit  16384(16384) → PullRequestContribute
Bit  32768(32768) → PullRequestBypassPolicy
```

### 3.6 Project-Level Permission Namespace

```
Namespace: "Project"
ID: 52d39943-cb85-4d7f-8fa8-c6baac873819
Token format: $PROJECT:vstfs:///Classification/TeamProject/{projectId}
```

### 3.7 API Rate Limits

- Azure DevOps imposes ~200 requests/5-second rolling window per token.
- Use request batching and caching. Implement exponential backoff on 429 responses.
- The `x-ms-continuationtoken` pagination pattern must be followed for large orgs.

---

## 4. Environment Variables & Credentials Setup

### 4.1 Backend `.env` File

Create `apps/backend/.env`:

```env
# ─── Azure DevOps Connection ──────────────────────────────────────────────────

# Your Azure DevOps organization name (from: https://dev.azure.com/YOUR_ORG)
AZURE_DEVOPS_ORG=your-organization-name

# Personal Access Token (see instructions below)
AZURE_DEVOPS_PAT=your-pat-token-here

# ─── Server Config ────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development

# ─── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGIN=http://localhost:5173

# ─── Cache (in-memory TTL in seconds) ─────────────────────────────────────────
CACHE_TTL_GROUPS=300
CACHE_TTL_USERS=300
CACHE_TTL_ACLS=120
```

### 4.2 Frontend `.env` File

Create `apps/frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_TITLE=Aclara Access Visualizer
```

### 4.3 How to Create a PAT Token (Step-by-Step)

1. Go to `https://dev.azure.com/{your-org}`
2. Click your **profile icon** (top right) → **Personal access tokens**
3. Click **+ New Token**
4. Configure:
   - **Name**: `Aclara-Visualizer`
   - **Organization**: Your org
   - **Expiration**: 90 days (or custom)
   - **Scopes** — Select **Custom defined**, then enable:
     | Scope | Permission |
     |---|---|
     | **Graph** | Read |
     | **Identity** | Read |
     | **Member Entitlement Management** | Read |
     | **Project and Team** | Read |
     | **Security** | Read |
     | **Code** | Read |
5. Click **Create** → Copy the token immediately (it's shown only once)
6. Paste it as `AZURE_DEVOPS_PAT` in your `.env`

### 4.4 Security Notes

- **Never commit `.env` files** — add both to `.gitignore`
- Use `.env.example` files (without real values) as templates in the repo
- For production, use Azure Key Vault or environment secrets in your CI/CD

---

## 5. Project Structure

```
aclara-access-visualizer/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── env.ts                  # Zod-validated env config
│   │   │   ├── clients/
│   │   │   │   └── azureDevOps.client.ts   # Axios client + retry logic
│   │   │   ├── services/
│   │   │   │   ├── graph.service.ts        # Users, groups, memberships
│   │   │   │   ├── security.service.ts     # Namespaces, ACLs, bitmask decode
│   │   │   │   ├── git.service.ts          # Repositories
│   │   │   │   ├── identity.service.ts     # Descriptor resolution
│   │   │   │   └── graphBuilder.service.ts # Builds the permission graph
│   │   │   ├── routes/
│   │   │   │   ├── graph.routes.ts         # GET /api/graph
│   │   │   │   ├── trace.routes.ts         # GET /api/trace/:userId/:repoId
│   │   │   │   ├── users.routes.ts         # GET /api/users
│   │   │   │   └── repos.routes.ts         # GET /api/repos
│   │   │   ├── middleware/
│   │   │   │   ├── cache.middleware.ts
│   │   │   │   └── errorHandler.ts
│   │   │   ├── types/
│   │   │   │   ├── azdo.types.ts           # Raw Azure DevOps API response types
│   │   │   │   └── graph.types.ts          # Internal graph model types
│   │   │   └── index.ts                    # Express app entry
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/
│       ├── src/
│       │   ├── api/
│       │   │   └── aclara.api.ts       # React Query hooks + API calls
│       │   ├── components/
│       │   │   ├── GraphCanvas/
│       │   │   │   ├── GraphCanvas.tsx     # react-flow canvas
│       │   │   │   ├── UserNode.tsx
│       │   │   │   ├── GroupNode.tsx
│       │   │   │   ├── RepoNode.tsx
│       │   │   │   └── PermissionEdge.tsx
│       │   │   ├── AccessTrace/
│       │   │   │   ├── AccessTracePanel.tsx
│       │   │   │   └── TraceStep.tsx
│       │   │   ├── Sidebar/
│       │   │   │   ├── UserList.tsx
│       │   │   │   └── RepoList.tsx
│       │   │   ├── Filters/
│       │   │   │   └── FilterBar.tsx
│       │   │   └── Layout/
│       │   │       └── AppShell.tsx
│       │   ├── stores/
│       │   │   └── visualizer.store.ts     # Zustand store for selection state
│       │   ├── types/
│       │   │   └── graph.types.ts
│       │   ├── utils/
│       │   │   └── permissionDecoder.ts
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── .env
│       ├── .env.example
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── .gitignore
├── .cursorrules
├── bunfig.toml
└── README.md
```

---

## 6. Cursor Rules — Prompt to Generate `.cursorrules`

> **How to use**: In Cursor, press `Cmd+Shift+P` → `Cursor: New Rules File` → paste the prompt below OR create `.cursorrules` manually at the project root.

### Prompt to give Cursor for generating the rules:

```
Generate a .cursorrules file for a project called "Aclara Access Visualizer".

The project is a fullstack TypeScript application:
- Backend: Node.js + Express, written in TypeScript, using Bun as package manager
- Frontend: React 18 + TypeScript + Vite, using Bun as package manager
- Graph visualization: react-flow (reactflow)
- State management: Zustand
- Data fetching: React Query (TanStack Query v5)
- HTTP client: Axios (backend), fetch via React Query (frontend)
- Schema validation: Zod (on backend config and API response parsing)
- Styling: Tailwind CSS

Rules to enforce:
1. TypeScript: strict mode always. No `any`. Use `unknown` and narrow with Zod or type guards.
2. All Azure DevOps API calls go through the centralized `AzureDevOpsClient` class — never raw fetch/axios in services.
3. Services are pure functions or classes with dependency injection — no global state in backend services.
4. All env vars are accessed only via `src/config/env.ts` (Zod-validated). Never `process.env.X` directly elsewhere.
5. API responses from Azure DevOps are always parsed with Zod schemas before use.
6. React components: functional only, no class components. Hooks in separate files where logic is complex.
7. File naming: kebab-case for files, PascalCase for components, camelCase for functions/variables.
8. Imports: absolute paths using `@/` alias for src root.
9. Error handling: all async functions use try/catch. Backend routes use the centralized error handler middleware.
10. Caching: all Azure DevOps API calls are wrapped with the in-memory cache utility with configurable TTL.
11. Comments: JSDoc on all exported functions and types.
12. No magic numbers: bitmask values and namespace IDs are defined as named constants in `constants/azdo.constants.ts`.
13. Pagination: all Graph API calls must handle `x-ms-continuationtoken` pagination exhaustively.
14. Rate limiting: implement 100ms delay between rapid sequential API calls; retry on 429 with exponential backoff.
15. react-flow nodes must be memoized with `React.memo` to prevent unnecessary re-renders.
16. Zustand store slices are typed with explicit interfaces.
17. All Bun scripts are defined in package.json — never run ad-hoc shell commands.
18. Git: conventional commits format (feat:, fix:, chore:, docs:, refactor:).
```

---

## 7. Master Implementation Prompt for Cursor

> **How to use**: Open Cursor Agent (Cmd+I or Cmd+Shift+I in Cursor), paste this entire prompt. This will generate the full codebase scaffolding.

---

```
You are building "Aclara Access Visualizer" — a fullstack TypeScript application that
visualizes Azure DevOps access control. Read the entire prompt before writing any code.

═══════════════════════════════════════════════════════
TECH STACK
═══════════════════════════════════════════════════════
- Runtime / Package Manager: Bun (use `bun` for all installs and scripts)
- Backend: Node.js + Express + TypeScript
- Frontend: React 18 + TypeScript + Vite
- Graph UI: @xyflow/react (react-flow v12)
- State: Zustand v4
- Data fetching: @tanstack/react-query v5
- Validation: Zod v3
- Styling: Tailwind CSS v3 (dark theme as default)
- HTTP: Axios on backend
- Linting: ESLint + Prettier

═══════════════════════════════════════════════════════
MONOREPO STRUCTURE
═══════════════════════════════════════════════════════
Create a monorepo with this structure:

aclara-access-visualizer/
├── apps/
│   ├── backend/    (Express API server)
│   └── frontend/   (React + Vite app)
├── .cursorrules
├── .gitignore
└── README.md

Use Bun workspaces. Root package.json should have:
  "workspaces": ["apps/*"]

Scripts in root package.json:
  "dev": "bun run --filter '*' dev"
  "build": "bun run --filter '*' build"

═══════════════════════════════════════════════════════
BACKEND: COMPLETE IMPLEMENTATION
═══════════════════════════════════════════════════════

── 1. Environment Config (apps/backend/src/config/env.ts) ──
Parse and validate all env vars with Zod:
  - AZURE_DEVOPS_ORG (string, required)
  - AZURE_DEVOPS_PAT (string, required)
  - PORT (number, default 3001)
  - NODE_ENV (enum: development | production | test)
  - CORS_ORIGIN (string, default http://localhost:5173)
  - CACHE_TTL_GROUPS, CACHE_TTL_USERS, CACHE_TTL_ACLS (number, defaults 300/300/120)
Throw a readable error with missing field names if validation fails.

── 2. Azure DevOps Client (apps/backend/src/clients/azureDevOps.client.ts) ──
Create an AzureDevOpsClient class using Axios:
  - Constructor takes { org, pat }
  - Properties: baseUrl, graphUrl (vssps.dev.azure.com), entitlementUrl (vsaex.dev.azure.com)
  - All requests use Basic auth: `Basic ${Buffer.from(':' + pat).toString('base64')}`
  - Default headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  - Axios interceptor: retry on 429 with exponential backoff (max 3 retries, 1s/2s/4s delays)
  - Axios interceptor: log request URL and status in development
  - Method: paginate<T>(url, params) — handles x-ms-continuationtoken pagination,
    collects all pages, returns T[]

── 3. Constants (apps/backend/src/constants/azdo.constants.ts) ──
Define all magic values as named exported constants:

  GIT_NAMESPACE_ID = '2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87'
  PROJECT_NAMESPACE_ID = '52d39943-cb85-4d7f-8fa8-c6baac873819'
  API_VERSION = '7.1'
  GRAPH_API_VERSION = '7.1-preview.1'
  ENTITLEMENT_API_VERSION = '7.1-preview.2'

  GIT_PERMISSIONS = {
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
    PullRequestBypassPolicy: 32768
  }

── 4. Types (apps/backend/src/types/) ──

azdo.types.ts — Raw API response shapes as Zod schemas AND TypeScript types:
  - AzdoProject: id, name, description, state, visibility
  - AzdoGroup: subjectDescriptor, principalName, displayName, descriptor, origin
  - AzdoUser: subjectDescriptor, principalName, displayName, mailAddress, descriptor
  - AzdoMembership: memberDescriptor, containerDescriptor
  - AzdoRepository: id, name, defaultBranch, remoteUrl, project { id, name }
  - AzdoAce: descriptor, allow (number), deny (number), extendedInfo?: { effectiveAllow, effectiveDeny }
  - AzdoAcl: token, inheritPermissions, acesDictionary (Record<string, AzdoAce>)
  - AzdoSecurityNamespace: namespaceId, name, actions [{ bit, name, displayName }]

graph.types.ts — Internal graph model:
  - NodeType: 'user' | 'group' | 'repo' | 'org'
  - PermissionLevel: 'allow' | 'deny' | 'inherited-allow' | 'inherited-deny' | 'not-set'
  - GraphNode: { id, type: NodeType, label, metadata: Record<string, unknown> }
  - GraphEdge: { id, source, target, permission: string, level: PermissionLevel }
  - AccessGraph: { nodes: GraphNode[], edges: GraphEdge[], projectId: string, generatedAt: string }
  - TraceStep: { subjectId, subjectType, subjectLabel, viaGroup?: string, permission, level, reason }
  - AccessTrace: { userId, repoId, steps: TraceStep[], effectivePermissions: string[] }

── 5. Services ──

graph.service.ts:
  Methods:
    listGroups(org): Promise<AzdoGroup[]>      — paginates Graph groups API
    listUsers(org): Promise<AzdoUser[]>         — paginates Graph users API
    getMemberships(org, descriptor, direction): Promise<AzdoMembership[]>
    buildMembershipMap(org): Promise<Map<string, string[]>>
      — Returns Map<groupDescriptor, memberDescriptor[]> for entire org

security.service.ts:
  Methods:
    getNamespaces(org): Promise<AzdoSecurityNamespace[]>
    getAcls(org, namespaceId, token): Promise<AzdoAcl[]>
    decodePermissions(bitmask: number, namespace: AzdoSecurityNamespace): string[]
      — Returns array of permission names where bit is set
    getEffectivePermissions(ace: AzdoAce, namespace: AzdoSecurityNamespace): {
      allowed: string[], denied: string[], effectiveAllowed: string[], effectiveDenied: string[]
    }

git.service.ts:
  Methods:
    listRepositories(org, project): Promise<AzdoRepository[]>

identity.service.ts:
  Methods:
    resolveDescriptors(org, descriptors: string[]): Promise<Map<string, string>>
      — Maps security descriptor → subjectDescriptor (batch POST to identities API)
      — Handles batching in groups of 50

graphBuilder.service.ts:
  This is the core aggregation service. Method:
  
  buildAccessGraph(org, project): Promise<AccessGraph>
  
  Algorithm:
    1. Fetch repos, groups, users, namespaces in parallel (Promise.all)
    2. Fetch membership map for all groups
    3. Fetch ACLs for Git namespace scoped to project token `repoV2/{projectId}`
       with recurse=true to get all repo-level ACLs
    4. Build identity cross-reference:
       - Map all ACE descriptors back to user/group subjectDescriptors
    5. Construct GraphNode[] — one node per user, group, and repo
    6. Construct GraphEdge[] — edges for:
       a. User → Group (membership)
       b. Group → Repo (permissions from ACL)
       c. User → Repo (direct explicit permissions from ACL)
    7. Return AccessGraph with generated timestamp

  Also implement:
  
  traceAccess(org, project, userId, repoId): Promise<AccessTrace>
  
  Algorithm:
    1. Find user by descriptor
    2. Get all groups the user belongs to (direct + transitive, up to 5 levels deep)
    3. For each group, check if there is an ACE for that group on the target repo's ACL token
    4. Also check for direct user ACE on the repo
    5. Build TraceStep[] explaining each path
    6. Compute final effectivePermissions by resolving deny-overrides-allow logic
    7. Flag if user has no path to any allow → "no access"

── 6. Cache Middleware (apps/backend/src/middleware/cache.middleware.ts) ──
In-memory cache using a Map<string, { data, expiresAt }>:
  - createCache(ttlSeconds): { get(key), set(key, data), invalidate(key), clear() }
  - One cache instance per service, injected at startup
  - Cache key = `${org}:${project}:${method_name}`

── 7. Routes ──

GET /api/projects
  → Lists all projects in the org (PAT is org-scoped; user picks a project from this list)

GET /api/graph?project={project}
  → Returns full AccessGraph JSON

GET /api/trace?userId={descriptor}&repoId={repoId}&project={project}
  → Returns AccessTrace for a specific user + repo

GET /api/users?project={project}
  → Returns simplified user list with display names

GET /api/repos?project={project}
  → Returns repo list

GET /api/health
  → { status: 'ok', org, timestamp }

── 8. Error Handler ──
Global Express error handler:
  - 400 for validation errors (Zod parse failures)
  - 401 if Azure DevOps returns 401/403
  - 404 for not found
  - 429 with Retry-After header for rate limit
  - 500 for unexpected errors
  - In development: include stack trace in response
  - In production: sanitize error messages

── 9. Entry Point (apps/backend/src/index.ts) ──
  - Express app setup with cors, helmet, express.json()
  - Mount all routes under /api
  - Listen on PORT from env config
  - Graceful shutdown on SIGTERM

═══════════════════════════════════════════════════════
FRONTEND: COMPLETE IMPLEMENTATION
═══════════════════════════════════════════════════════

── 1. Vite Config ──
  - Set up path alias: '@/' → src/
  - Proxy /api to http://localhost:3001 in dev

── 2. Tailwind Config ──
  - darkMode: 'class'
  - Custom colors: primary (#6366f1 indigo), surface (#1e1e2e dark navy), 
    node-user (#3b82f6), node-group (#8b5cf6), node-repo (#10b981)

── 3. Types (apps/frontend/src/types/graph.types.ts) ──
Mirror the backend graph types (or share via a types package).

── 4. API Layer (apps/frontend/src/api/aclara.api.ts) ──
React Query hooks:
  useGraph(project): returns AccessGraph
  useTrace(userId, repoId, project): returns AccessTrace (enabled only when both set)
  useProjects(): returns project list
  useUsers(project): returns user list
  useRepos(project): returns repo list

── 5. Zustand Store (apps/frontend/src/stores/visualizer.store.ts) ──
Interface VisualizerState:
  selectedProject: string | null
  selectedUserId: string | null
  selectedRepoId: string | null
  hoveredNodeId: string | null
  filterText: string
  showOnlyOverPrivileged: boolean
  layoutMode: 'hierarchical' | 'force' | 'radial'

── 6. GraphCanvas Component ──

GraphCanvas.tsx:
  - Uses @xyflow/react (ReactFlow)
  - Transforms AccessGraph.nodes and AccessGraph.edges into ReactFlow nodes/edges
  - Node positions: use dagre layout algorithm for hierarchical view
    Install: @dagrejs/dagre
  - Custom node types: UserNode, GroupNode, RepoNode
  - Custom edge type: PermissionEdge (colored by permission level)
  - On node click: set selectedUserId or selectedRepoId in Zustand store
  - Controls panel: zoom in/out, fit view, layout toggle
  - MiniMap in bottom-right corner

UserNode.tsx:
  - Icon: person icon (lucide-react)
  - Shows: display name, email (truncated)
  - Color: blue border (#3b82f6)
  - Badge if user has any "deny" or elevated permissions (ManagePermissions, Administer)

GroupNode.tsx:
  - Icon: users icon
  - Shows: group display name, member count badge
  - Color: purple border (#8b5cf6)

RepoNode.tsx:
  - Icon: git branch icon
  - Shows: repo name
  - Color: green border (#10b981)

PermissionEdge.tsx:
  - Animated edge (use animated: true in ReactFlow)
  - Color coded: allow=green, deny=red, inherited=gray
  - Label: permission name (e.g. "GenericContribute")
  - On hover: show full permission list in tooltip

── 7. AccessTracePanel Component ──
  - Appears as a right-side drawer when both user and repo are selected
  - Fetches trace data with useTrace hook
  - Renders a vertical stepper/timeline showing:
    Step 1: User identity
    Step 2→N: "via group [GroupName]" with group descriptor
    Final: Effective permissions (green chips) and denied permissions (red chips)
  - Shows a clear message if the user has NO access path to the repo

── 8. FilterBar Component ──
  - Search input: filters visible nodes by name
  - Toggle: "Show only over-privileged" — highlight users with Administer/ManagePermissions/PullRequestBypassPolicy
  - Project selector dropdown
  - Layout selector: Hierarchical / Force / Radial

── 9. Sidebar Component ──
  - Left panel with two tabs: Users | Repositories
  - Each tab: searchable list with click-to-select
  - Selected item is highlighted and sets Zustand store
  - Shows a small permission count badge per item

── 10. AppShell Component ──
  Layout:
  ┌────────────────────────────────────────────────┐
  │  Header: logo | project selector | dark/light  │
  ├───────────┬──────────────────────┬─────────────┤
  │  Sidebar  │   Graph Canvas       │ Trace Panel │
  │ (240px)   │   (flex-1)           │ (320px)     │
  │ Users     │                      │ (slide-in)  │
  │ Repos     │                      │             │
  └───────────┴──────────────────────┴─────────────┘
  │  StatusBar: node count | edge count | last sync │
  └────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════
PACKAGE DEPENDENCIES
═══════════════════════════════════════════════════════

Backend (bun add):
  express @types/express
  axios
  zod
  cors @types/cors
  helmet
  dotenv
  typescript @types/node
  ts-node-dev (devDep)

Frontend (bun add):
  react react-dom
  @types/react @types/react-dom
  @xyflow/react
  @dagrejs/dagre
  @types/dagre
  @tanstack/react-query
  zustand
  lucide-react
  tailwindcss postcss autoprefixer
  vite @vitejs/plugin-react

═══════════════════════════════════════════════════════
README.md
═══════════════════════════════════════════════════════
Generate a comprehensive README with:
  - What the project does
  - Prerequisites: Node.js 20+, Bun 1.x, Azure DevOps org access
  - Setup steps: clone, bun install, copy .env.example, fill credentials
  - How to create the PAT token (link to Azure DevOps docs)
  - How to run: bun run dev
  - API documentation table of all endpoints
  - Architecture diagram (ASCII)
  - Screenshots placeholder section

═══════════════════════════════════════════════════════
IMPORTANT IMPLEMENTATION NOTES
═══════════════════════════════════════════════════════

1. The Azure DevOps Graph API uses DIFFERENT descriptors than the Security ACL API.
   - Graph API: subjectDescriptor (e.g. "aad.xxx", "vssgp.xxx")
   - Security ACL: identity descriptor (e.g. "Microsoft.TeamFoundation.Identity;xxx")
   You MUST implement identity resolution to correlate them. The identities API
   (POST /_apis/identities) accepts security descriptors and returns objects containing
   both descriptor formats. Build a bidirectional map.

2. ACL token format for Git repos is: `repoV2/{projectId}/{repoId}`
   For project-level: `repoV2/{projectId}`
   Fetch with recurse=true to get all nested tokens in one call.

3. Pagination in Graph API uses response header `x-ms-continuationtoken`.
   Pass it as query param `continuationToken` in next request. Loop until header absent.

4. Bitmask decoding: to check if a permission bit is set:
   `(bitmask & permissionBit) === permissionBit`
   Effective permission = allow & ~deny (allowed bits minus denied bits).

5. Over-privileged detection heuristic: flag any user/group ACE that has
   `Administer (1)`, `ManagePermissions (8192)`, or `PullRequestBypassPolicy (32768)` set.

6. For the dagre layout, use:
   - rankdir: 'LR' (left to right)
   - ranksep: 100, nodesep: 50
   - Order: Org → Groups → Users on left, Repos on right

Start by scaffolding the full directory structure and package.json files,
then implement backend services in order: client → constants → types → services → routes,
then implement frontend in order: store → api hooks → nodes → canvas → panels → shell.
```

---

## 8. Data Model Reference

### AccessGraph (returned by `/api/graph`)

```typescript
{
  projectId: "abc123",
  generatedAt: "2025-04-06T10:00:00Z",
  nodes: [
    { id: "user:vssgp.abc", type: "user",  label: "Alice Smith",    metadata: { email: "alice@co.com" } },
    { id: "grp:vssgp.xyz",  type: "group", label: "Contributors",   metadata: { memberCount: 12 } },
    { id: "repo:repo1",     type: "repo",  label: "api-service",    metadata: { defaultBranch: "main" } }
  ],
  edges: [
    { id: "e1", source: "user:vssgp.abc", target: "grp:vssgp.xyz",  permission: "member",             level: "allow" },
    { id: "e2", source: "grp:vssgp.xyz",  target: "repo:repo1",     permission: "GenericContribute",  level: "inherited-allow" },
    { id: "e3", source: "user:vssgp.abc", target: "repo:repo1",     permission: "ManagePermissions",  level: "allow" }
  ]
}
```

### AccessTrace (returned by `/api/trace`)

```typescript
{
  userId: "user:vssgp.abc",
  repoId: "repo:repo1",
  effectivePermissions: ["GenericRead", "GenericContribute", "CreateBranch"],
  steps: [
    { subjectId: "vssgp.abc", subjectType: "user",  subjectLabel: "Alice Smith",  permission: "member", level: "allow", reason: "Direct group membership" },
    { subjectId: "vssgp.xyz", subjectType: "group", subjectLabel: "Contributors", permission: "GenericContribute", level: "inherited-allow", reason: "Group has ACE on repo token repoV2/proj1/repo1" },
    { subjectId: "vssgp.abc", subjectType: "user",  subjectLabel: "Alice Smith",  permission: "ManagePermissions", level: "allow", reason: "Direct explicit ACE on repo" }
  ]
}
```

---

## 9. API Endpoint Contract

| Method | Path | Query Params | Response |
|---|---|---|---|
| GET | `/api/health` | — | `{ status, org, timestamp }` |
| GET | `/api/projects` | — | `AzdoProject[]` |
| GET | `/api/users` | `project` | `{ id, label, email }[]` |
| GET | `/api/repos` | `project` | `{ id, name, defaultBranch }[]` |
| GET | `/api/graph` | `project` | `AccessGraph` |
| GET | `/api/trace` | `userId`, `repoId`, `project` | `AccessTrace` |

---

## 10. Frontend Component Map

```
App
└── QueryClientProvider + ZustandProvider
    └── AppShell
        ├── Header
        │   ├── Logo
        │   ├── ProjectSelector (dropdown)
        │   └── ThemeToggle
        ├── Sidebar
        │   ├── Tab: UserList (click → set selectedUserId)
        │   └── Tab: RepoList (click → set selectedRepoId)
        ├── MainArea
        │   ├── FilterBar (filter text, over-priv toggle, layout mode)
        │   └── GraphCanvas (react-flow + dagre)
        │       ├── UserNode (custom)
        │       ├── GroupNode (custom)
        │       ├── RepoNode (custom)
        │       └── PermissionEdge (custom, animated)
        ├── AccessTracePanel (drawer, shown when user+repo selected)
        │   └── TraceStep (timeline item)
        └── StatusBar
```

---

## 11. Known API Gotchas

| Issue | Description | Fix |
|---|---|---|
| **Descriptor mismatch** | Graph uses `subjectDescriptor`, Security uses old identity descriptor | Use POST `/_apis/identities` to resolve both; build a bidirectional map at startup |
| **Empty ACL dict** | Some repos have no explicit ACEs (all inherited) | When ACE dict is empty, walk up to project-level token `repoV2/{projectId}` for inherited entries |
| **Preview API headers** | Graph API requires `Accept: application/json;api-version=7.1-preview.1` | Always set full Accept header with api-version |
| **Pagination missing** | Graph API silently truncates at 100 without pagination | Always loop on `x-ms-continuationtoken` |
| **AAD-linked users** | AAD users have `origin: aad` and may have different descriptor format | Handle both `aad.*` and `vss.*` origins in identity resolution |
| **Group nesting depth** | Groups can be nested 10+ levels deep | Use BFS with visited set for transitive membership resolution; cap at depth 10 |
| **PAT scope 403** | Security namespace API returns 403 if PAT lacks Security:Read scope | Document required PAT scopes clearly; return helpful error message |
| **Rate limits** | Large orgs with 1000+ users will hit rate limits | Implement request queue with 100ms minimum interval + 429 retry backoff |

---

*Generated for Aclara Access Visualizer — April 2025*
*Azure DevOps API Version: 7.1 | Stack: React + TypeScript + Node.js + Bun*