const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined;
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined;

export function isEntraConfigured(): boolean {
  return Boolean(clientId && tenantId);
}
