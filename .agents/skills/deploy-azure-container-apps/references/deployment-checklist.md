# Deployment Checklist

Use this checklist for deployments and redeploy troubleshooting in this repository.

## Pre-Deploy

1. From the repo root, build the frontend:

```powershell
Set-Location frontend
npm run build
Set-Location ..
```

2. Compile the Bicep template:

```powershell
az bicep build --file infra/main.bicep
```

3. Confirm the frontend proxy contract is still intact:

- `frontend/nginx.conf` uses `${BACKEND_ORIGIN}`
- `frontend/Dockerfile` copies nginx config to `/etc/nginx/templates/default.conf.template`
- `frontend/src/api/baseUrl.ts` keeps production on same-origin API paths

## Deploy

```powershell
az deployment group create --resource-group <resource-group> --template-file infra/main.bicep --parameters namePrefix="vactracker" containerRegistryServer="<registry-server>" backendImageTag="<backend-tag>" frontendImageTag="<frontend-tag>"
```

## Post-Deploy Verification

1. Check revisions:

```powershell
az containerapp revision list -g <resource-group> -n <frontend-app> -o table
az containerapp revision list -g <resource-group> -n <backend-app> -o table
```

2. Verify runtime variables on the frontend app if the API path fails:

```powershell
az containerapp show -g <resource-group> -n <frontend-app> --query properties.template.containers[0].env
```

If the backend serves direct callers or generates notification links, also inspect the backend runtime values:

```powershell
az containerapp show -g <resource-group> -n <backend-app> --query properties.template.containers[0].env
```

3. Smoke-test the actual user path through the frontend origin:

```powershell
curl -i https://<frontend-fqdn>/api/v1/public-holidays/SE/2026
curl -I https://<frontend-fqdn>/api/v1/exports/leave-requests.csv
```

4. Verify the backend is healthy directly:

```powershell
curl -i https://<backend-fqdn>/health
```

## Failure Triage

- Frontend loads, API fails:
  Check `BACKEND_ORIGIN`, frontend revision health, and whether requests are still same-origin `/api/*`.
- Notification links or direct backend callers point at the wrong frontend:
  Check `FRONTEND_URL` and optional `FRONTEND_ALLOWED_ORIGINS` on the backend revision.
- Frontend export links fail but data pages load:
  Check `frontend/src/components/ManagerDashboard/ManagerDashboard.tsx` and confirm exports still resolve through the shared base URL helper.
- Bicep deploy succeeds but traffic still points at the wrong backend:
  Check whether the active frontend revision updated and whether an older revision is still serving traffic.
- Docs contain old FQDNs:
  Remove them. The repo should describe deployment outputs and verification commands, not pin environment-generated hostnames.