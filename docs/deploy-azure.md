# Deploy Aclara to Azure App Service (GitHub Actions)

The workflow `[.github/workflows/deploy-main.yml](../.github/workflows/deploy-main.yml)` runs on every push to `main` (and can be run manually via **Actions → Deploy to Azure App Service → Run workflow**).

## What the pipeline does

1. Installs dependencies with **Bun** at the repo root (`bun install --frozen-lockfile`).
2. Builds the Vite frontend (`apps/frontend`), then copies `apps/frontend/dist` into `apps/backend/public`.
3. Compiles the Express backend (`tsc` + `tsc-alias`) into `apps/backend/dist`.
4. Stages a self-contained folder `**.azure-deploy/`** (backend `dist`, `public`, `package.json`, and `npm install --omit=dev`) so Azure receives production `node_modules` without relying on Bun workspaces on the server.
5. Logs into Azure, updates a small set of App Service **application settings**, and deploys the staged folder with `**azure/webapps-deploy`**.

## GitHub configuration

Create a GitHub **Environment** (the workflow uses `environment: production` — rename the workflow if you use another name) and attach the following.

### Secrets


| Secret                         | Purpose                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `AZURE_CREDENTIALS`            | Service principal JSON for `azure/login@v2` (same pattern as Azure’s GitHub Actions docs).                           |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Publish profile XML for `azure/webapps-deploy@v2`. Download from the App Service **Overview → Get publish profile**. |


### Variables


| Variable            | Purpose                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AZURE_WEBAPP_NAME` | Name of the Azure App Service (e.g. `aclara-prod`).                                                                                                                                                                       |
| `NODE_ENV`          | Use `production`.                                                                                                                                                                                                         |
| `CORS_ORIGIN`       | **Must match the browser origin** of your deployed app exactly: scheme + host + optional port (e.g. `https://your-app.azurewebsites.net`). For the single-host layout (API + SPA on the same URL), this is your site URL. |


## Verification

- `GET https://<host>/api/health` returns JSON.
- Opening `/`, `/connect`, and `/workspace?...` loads the SPA (including full page refresh).
- Connect flow works with `**CORS_ORIGIN`** set to that same `https://<host>` origin.

