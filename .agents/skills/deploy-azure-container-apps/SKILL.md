---
name: deploy-azure-container-apps
description: 'Deploy or redeploy this holidays application to Azure Container Apps. Use when asked to deploy the frontend/backend, update Bicep-driven infrastructure, verify revisions, troubleshoot frontend-to-backend connectivity after a redeploy, or run post-deploy smoke tests.'
argument-hint: 'Describe the target environment, resource group, image tags, and whether this is a deploy, redeploy, or connectivity investigation.'
user-invocable: true
---

# Deploy Azure Container Apps

Use this skill when working on Azure deployments for this repository, especially when the task involves Container Apps revisions, Bicep updates, runtime environment variables, or frontend-to-backend connectivity after a redeploy.

## Key Facts For This Repo

| Fact | Value |
|---|---|
| Resource Group | `rg-holidays` |
| Container Registry | `crholdaysdev001.azurecr.io` |
| Backend Container App | `ca-holidays-backend` |
| Frontend Container App | `ca-holidays-frontend` |
| Frontend FQDN | `ca-holidays-frontend.nicegrass-38567ece.northeurope.azurecontainerapps.io` |
| Backend FQDN | `ca-holidays-backend.nicegrass-38567ece.northeurope.azurecontainerapps.io` |

- Production browser traffic should go to the frontend origin only.
- The deployed frontend uses nginx to proxy `/api/*` to the backend origin supplied by the `BACKEND_ORIGIN` runtime variable.
- Local development uses the Vite dev-server `/api` proxy (configured via `API_PROXY_TARGET` env var, default `http://localhost:8000`).
- The backend uses `FRONTEND_URL` for canonical links and `FRONTEND_ALLOWED_ORIGINS` for explicit CORS origins.
- Azure Container Apps FQDNs are environment outputs and can change across redeploys; never hardcode them in code or docs.

## Architecture

```
Browser ──HTTPS──▶ Container Apps Ingress (TLS termination)
                         │
                         ▼
                  Frontend (nginx:8080)
                    ├── static files (SPA)
                    └── /api/* ──proxy──▶ Backend (uvicorn:8000)
```

## Critical Deployment Details

### Non-Root Containers
- **Frontend**: runs nginx as the `nginx` user on port **8080** (non-privileged). The Dockerfile patches `/etc/nginx/nginx.conf` to:
  - Comment out `user nginx;`
  - Move PID file to `/tmp/nginx.pid`
- **Backend**: runs as `appuser` (non-root).
- Container Apps ingress `targetPort` must be **8080** for frontend, **8000** for backend.

### Nginx Behind TLS-Terminating Proxy
Container Apps terminates TLS and forwards HTTP to the container. This causes two problems that the nginx config explicitly handles:

1. **`absolute_redirect off;`** — Without this, nginx generates absolute redirect URLs using its internal `http://host:8080` address. Since browsers block mixed content (HTTP on an HTTPS page), these redirects fail silently. `absolute_redirect off` makes nginx emit **relative** `Location` headers instead.

2. **`X-Forwarded-Proto` forwarding** — nginx receives requests over plain HTTP from the Container Apps ingress. If it sets `X-Forwarded-Proto: $scheme`, the backend sees `http` and generates `http://` redirect URLs (e.g. FastAPI's trailing-slash redirects). The config uses `$http_x_forwarded_proto` (with `$scheme` fallback) to preserve the original protocol from Container Apps.

### Secrets
The backend Container App stores these as Container Apps secrets (not plaintext env vars):
- `cosmos-key` → `COSMOS_DB_KEY`
- `acs-conn` → `ACS_CONNECTION_STRING`
- `acr-password` → registry pull credential

### Docker Is Not Required Locally
Use `az acr build` to build images in the cloud. On Windows, use `--no-logs` to avoid the `charmap`/encoding crash:
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONUTF8 = "1"
az acr build --registry crholdaysdev001 --image "frontend:$TAG" --file frontend/Dockerfile frontend/ --no-logs
```

## Use When

- Deploying or redeploying frontend and backend images to Azure Container Apps
- Updating `infra/main.bicep` or Container App runtime variables
- Verifying or repairing frontend-to-backend communication after a deployment
- Checking whether the active frontend revision points at the correct backend origin
- Running post-deploy smoke tests for `/health`, `/api/v1/public-holidays/*`, or exports

## Procedure

1. Read the deployment context in `infra/main.bicep`, `frontend/nginx.conf`, `frontend/Dockerfile`, and `backend/Dockerfile` before making changes.
2. Confirm the intended request path:
   - Production: browser → nginx `/api/*` → backend origin
   - Local dev: Vite proxy (configured via `API_PROXY_TARGET` env var)
3. Build images using `az acr build` (add `--no-logs` on Windows):
   ```powershell
   $TAG = "descriptive-tag"
   az acr build --registry crholdaysdev001 --image "backend:$TAG" --file backend/Dockerfile backend/ --no-logs
   az acr build --registry crholdaysdev001 --image "frontend:$TAG" --file frontend/Dockerfile frontend/ --no-logs
   ```
4. Deploy:
   ```powershell
   az containerapp update -g rg-holidays -n ca-holidays-backend --image "crholdaysdev001.azurecr.io/backend:$TAG"
   az containerapp update -g rg-holidays -n ca-holidays-frontend --image "crholdaysdev001.azurecr.io/frontend:$TAG"
   ```
5. If the frontend ingress target port changed, update it:
   ```powershell
   az containerapp ingress update -g rg-holidays -n ca-holidays-frontend --target-port 8080
   ```
6. Verify revisions are healthy and active:
   ```powershell
   az containerapp revision list -g rg-holidays -n ca-holidays-frontend --query "[?properties.active && properties.trafficWeight>``0``].{name:name, runningState:properties.runningState}" -o json
   ```
7. Run smoke tests through the frontend origin, then verify backend `/health` directly.
8. If connectivity fails after redeploy, check for drift in runtime env vars, active revisions, and any reintroduction of hardcoded backend hostnames.

## Required Checks

- Frontend revision is active and running (not CrashLoopBackOff)
- Backend revision is active and running
- `https://<frontend-fqdn>/api/v1/public-holidays/SE/2026` returns 200
- `https://<frontend-fqdn>/api/v1/exports/leave-requests.csv` is reachable
- `https://<backend-fqdn>/health` returns 200
- No mixed-content errors in browser console

## Common Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| CrashLoopBackOff: `bind() to 0.0.0.0:80 failed (Permission denied)` | nginx running as non-root can't bind privileged ports | Use port 8080 in nginx.conf; set ingress targetPort to 8080 |
| CrashLoopBackOff: `open() "/run/nginx.pid" failed (Permission denied)` | PID file not writable by nginx user | `sed -i 's\|/run/nginx.pid\|/tmp/nginx.pid\|'` in Dockerfile |
| Mixed Content: `http://....:8080/api/...` | nginx emits absolute redirects with internal port | Add `absolute_redirect off;` to nginx server block |
| Mixed Content: `http://` redirects (no port) | `X-Forwarded-Proto` set to `$scheme` (always `http` behind TLS proxy) | Forward original: `$http_x_forwarded_proto` with `$scheme` fallback |
| `az acr build` fails with `charmap` codec error on Windows | Console encoding issue | Set `[Console]::OutputEncoding = UTF8`, `$env:PYTHONUTF8="1"`, use `--no-logs` |

## References

- [Deployment checklist](./references/deployment-checklist.md)
