# InsightOps Access Visualizer

Fullstack TypeScript monorepo that visualizes Azure DevOps access control graphs.

## Structure

- `apps/backend` — Express API + Azure DevOps client
- `apps/frontend` — React + Vite + Tailwind + React Flow

## Prerequisites

- [Bun](https://bun.sh/) installed

## Setup

```bash
bun install
```

Copy `apps/backend/.env.example` to `apps/backend/.env` and set `AZURE_DEVOPS_ORG` and `AZURE_DEVOPS_PAT`.

**Note:** `@types/dagre` is pinned to `^0.7.54` because `^0.8.9` is not published on the registry; it provides typings for `@dagrejs/dagre`.

## Scripts (root)

| Script       | Description                    |
| ------------ | ------------------------------ |
| `bun run dev` | Run all workspace `dev` scripts |
| `bun run build` | Build all packages            |
| `bun run typecheck` | Typecheck all packages    |

## Development

Terminal 1 — backend (default port `3001`):

```bash
cd apps/backend && bun run dev
```

Terminal 2 — frontend (Vite, proxies `/api` to backend):

```bash
cd apps/frontend && bun run dev
```

Health check: `GET http://localhost:3001/api/health`

## License

Private — internal use.
