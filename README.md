# InsightOps Access Visualizer

Fullstack TypeScript monorepo that visualizes Azure DevOps access control graphs.

## Structure

- `apps/backend` — Express API + Azure DevOps client (session or optional env credentials)
- `apps/frontend` — React + Vite + Tailwind + React Flow

## Prerequisites

- [Bun](https://bun.sh/) installed

## Setup

```bash
bun install
```

Copy `apps/backend/.env.example` to `apps/backend/.env`. **Either:**

- Leave `AZURE_DEVOPS_ORG` / `AZURE_DEVOPS_PAT` unset and use the UI **Connect** flow (`POST /api/session/connect`, HttpOnly session cookie), **or**
- Set org + PAT in `.env` for a fixed server-side connection (still works alongside sessions; session takes precedence when present).

**Note:** `@types/dagre` is pinned to `^0.7.54` because `^0.8.9` is not published on the registry; it provides typings for `@dagrejs/dagre`.

## Scripts (root)

| Script | Description |
| ------ | ----------- |
| `bun run dev` | Run all workspace `dev` scripts |
| `bun run build` | Build all packages |
| `bun run typecheck` | Typecheck all packages |
| `bun run test` | Run `bun test` in each workspace that defines `test` |

## Development

Terminal 1 — backend (default port `3001`):

```bash
cd apps/backend && bun run dev
```

Terminal 2 — frontend (Vite, proxies `/api` to backend):

```bash
cd apps/frontend && bun run dev
```

Open the app at the Vite URL (e.g. `http://localhost:5173`). You will land on **Workspace**; if not connected, you are redirected to **Connect**.

- The SPA uses `fetch(..., { credentials: "include" })` so the session cookie is sent on API calls.
- CORS must allow credentials (`CORS_ORIGIN` in backend `.env` should match the Vite origin).

Health check: `GET http://localhost:3001/api/health`

### URL state

With a project selected, the workspace syncs `project`, `user`, `repo`, and `view` (`overview` | `investigate`) query parameters for refresh and deep-linking.

## License

Private — internal use.
