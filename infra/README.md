# Infrastructure Deployment Guide

This directory contains Azure Bicep templates to provision all required cloud resources.

## Resources

| Resource | Description |
|---|---|
| Azure Cosmos DB (Serverless) | NoSQL database for Users, LeaveRequests, BusinessUnits |
| Azure Communication Services | Transactional email delivery |
| Azure Container Apps Environment | Shared compute environment |
| Container App: backend | FastAPI application |
| Container App: frontend | React/Nginx application |

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in
- A container registry (e.g., GitHub Container Registry or Azure Container Registry)
- A resource group already created

## Deploy

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "<subscription-id>"

# Deploy the Bicep template
az deployment group create \
  --resource-group "<your-resource-group>" \
  --template-file infra/main.bicep \
  --parameters \
      namePrefix="vactracker" \
      containerRegistryServer="ghcr.io/your-org" \
      backendImageTag="main" \
      frontendImageTag="main"
```

## Notes

- Cosmos DB is provisioned with **Continuous 7-Day backup** (Point-in-Time Restore) enabled.
- Container Apps scale to **zero** when idle to minimise cost.
- Secrets (Cosmos DB keys, ACS connection strings) should be stored in Azure Key Vault and referenced via Container Apps secrets — not hardcoded in the Bicep file.
