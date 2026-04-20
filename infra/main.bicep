// ─────────────────────────────────────────────────────────────────────────────
// main.bicep — Azure infrastructure for the Team Vacation Tracker
//
// Resources provisioned:
//   - Azure Container Apps Environment
//   - Container App: backend (FastAPI)
//   - Container App: frontend (React / Nginx)
//   - Azure Cosmos DB (Serverless, Free Tier)
//   - Azure Communication Services
// ─────────────────────────────────────────────────────────────────────────────

@description('Name prefix for all resources')
param namePrefix string = 'vactracker'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Container registry server (e.g. ghcr.io/your-org)')
param containerRegistryServer string

@description('Backend container image tag')
param backendImageTag string = 'latest'

@description('Frontend container image tag')
param frontendImageTag string = 'latest'

@description('Microsoft Entra ID tenant ID for backend token validation')
param azureTenantId string = ''

@description('Microsoft Entra ID client ID for backend token validation')
param azureClientId string = ''

@secure()
@description('Microsoft Entra ID client secret')
param azureClientSecret string = ''

// ─── Cosmos DB ───────────────────────────────────────────────────────────────
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {
  name: '${namePrefix}-cosmos'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: true
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: {
        tier: 'Continuous7Days'
      }
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      { name: 'EnableServerless' }
    ]
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-02-15-preview' = {
  parent: cosmosAccount
  name: 'vacation-tracker'
  properties: {
    resource: { id: 'vacation-tracker' }
  }
}

var containers = ['Users', 'LeaveRequests', 'BusinessUnits']

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = [for c in containers: {
  parent: cosmosDatabase
  name: c
  properties: {
    resource: {
      id: c
      partitionKey: { paths: ['/id'], kind: 'Hash' }
    }
  }
}]

// ─── Azure Communication Services ────────────────────────────────────────────
resource acs 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: '${namePrefix}-acs'
  location: 'global'
  properties: {
    dataLocation: 'Europe'
  }
}

// ─── Container Apps Environment ──────────────────────────────────────────────
resource caEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${namePrefix}-env'
  location: location
  properties: {}
}

// ─── Backend Container App ────────────────────────────────────────────────────
resource backendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-backend'
  location: location
  properties: {
    managedEnvironmentId: caEnv.id
    configuration: {
      // Backend is only reached via the frontend's nginx reverse-proxy;
      // no need to expose it to the public internet.
      ingress: {
        external: false
        targetPort: 8000
        transport: 'auto'
      }
      secrets: [
        { name: 'cosmos-db-key', value: cosmosAccount.listKeys().primaryMasterKey }
        { name: 'acs-connection-string', value: acs.listKeys().primaryConnectionString }
        { name: 'azure-client-secret', value: azureClientSecret }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: '${containerRegistryServer}/vacation-tracker-backend:${backendImageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'APP_ENV', value: 'production' }
            { name: 'COSMOS_DB_URL', value: cosmosAccount.properties.documentEndpoint }
            { name: 'COSMOS_DB_NAME', value: 'vacation-tracker' }
            { name: 'COSMOS_DB_KEY', secretRef: 'cosmos-db-key' }
            { name: 'ACS_CONNECTION_STRING', secretRef: 'acs-connection-string' }
            { name: 'AZURE_TENANT_ID', value: azureTenantId }
            { name: 'AZURE_CLIENT_ID', value: azureClientId }
            { name: 'AZURE_CLIENT_SECRET', secretRef: 'azure-client-secret' }
            // CORS: the frontend FQDN is the only allowed origin in production.
            { name: 'FRONTEND_ALLOWED_ORIGINS', value: 'https://${namePrefix}-frontend.${caEnv.properties.defaultDomain}' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 5 }
    }
  }
}

// ─── Frontend Container App ───────────────────────────────────────────────────
resource frontendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-frontend'
  location: location
  properties: {
    managedEnvironmentId: caEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: '${containerRegistryServer}/vacation-tracker-frontend:${frontendImageTag}'
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'BACKEND_ORIGIN', value: 'https://${backendApp.properties.configuration.ingress.fqdn}' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 3 }
    }
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
output frontendUrl string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
