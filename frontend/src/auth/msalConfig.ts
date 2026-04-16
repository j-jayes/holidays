import { PublicClientApplication, Configuration } from "@azure/msal-browser";

// TODO: Set VITE_ENTRA_CLIENT_ID and VITE_ENTRA_TENANT_ID once app registrations
// are created in Azure Portal. Until then, PasswordGate is used instead.
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined;
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined;
const redirectUri = import.meta.env.VITE_ENTRA_REDIRECT_URI as string | undefined;

const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? "00000000-0000-0000-0000-000000000000",
    authority: `https://login.microsoftonline.com/${tenantId ?? "common"}`,
    redirectUri: redirectUri ?? window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

/** Scopes requested when calling the backend API. */
export const apiScopes = clientId
  ? [`api://${clientId}/access_as_user`]
  : [];
