---
name: deploy-azure-container-apps
description: 'Deploy or redeploy this holidays application to Azure Container Apps. Use when asked to deploy the frontend/backend, update Bicep-driven infrastructure, verify revisions, troubleshoot frontend-to-backend connectivity after a redeploy, or run post-deploy smoke tests.'
argument-hint: 'Describe the target environment, resource group, image tags, and whether this is a deploy, redeploy, or connectivity investigation.'
user-invocable: true
---

# Deploy Azure Container Apps

Use this skill when working on Azure deployments for this repository, especially when the task involves Container Apps revisions, Bicep updates, runtime environment variables, or frontend-to-backend connectivity after a redeploy.

## Key Facts For This Repo

- Production browser traffic should go to the frontend origin only.
- The deployed frontend uses nginx to proxy `/api/*` to the backend origin supplied by the `BACKEND_ORIGIN` runtime variable.
- Local development may still use `VITE_API_BASE_URL`, but deployed frontend traffic must not depend on a baked backend URL.
- The backend uses `FRONTEND_URL` for canonical links and can use `FRONTEND_ALLOWED_ORIGINS` for explicit direct-call CORS overrides.
- Azure Container Apps FQDNs are environment outputs and can change across redeploys; never hardcode them in code or docs.

## Use When

- Deploying or redeploying frontend and backend images to Azure Container Apps
- Updating `infra/main.bicep` or Container App runtime variables
- Verifying or repairing frontend-to-backend communication after a deployment
- Checking whether the active frontend revision points at the correct backend origin
- Running post-deploy smoke tests for `/health`, `/api/v1/public-holidays/*`, or exports

## Procedure

1. Read the deployment context in `infra/main.bicep`, `infra/README.md`, `frontend/nginx.conf`, `frontend/Dockerfile`, and `frontend/src/api/baseUrl.ts` before making changes.
2. Confirm the intended request path:
   - Production: browser -> frontend origin -> `/api/*` -> nginx proxy -> backend origin
   - Local dev: Vite may use `VITE_API_BASE_URL`
3. Before changing infra, validate the app locally when possible:
   - Run the frontend build
   - Compile the Bicep template
4. When deploying, ensure the frontend Container App receives `BACKEND_ORIGIN` as the backend HTTPS origin without a trailing slash.
5. If the backend sends notification links or serves direct callers, ensure `FRONTEND_URL` and any optional `FRONTEND_ALLOWED_ORIGINS` values match the intended frontend origins.
6. After deployment, verify both frontend and backend revisions are healthy and active.
7. Run smoke tests through the frontend origin first, then verify backend `/health` directly.
8. If connectivity fails after redeploy, check for drift in runtime env vars, active revisions, and any reintroduction of hardcoded backend hostnames.

## Required Checks

- Frontend build passes
- Bicep template compiles
- Frontend revision is active
- Backend revision is active
- `https://<frontend-fqdn>/api/v1/public-holidays/SE/2026` returns successfully
- `https://<frontend-fqdn>/api/v1/exports/leave-requests.csv` is reachable
- `https://<backend-fqdn>/health` returns `200`

## References

- [Deployment checklist](./references/deployment-checklist.md)
