/**
 * useAuth — thin abstraction over the current auth mechanism.
 *
 * TODO: When Entra ID app registrations are ready, replace the body of this
 * hook with the MSAL version below and remove PasswordGate from index.tsx:
 *
 *   import { useIsAuthenticated, useMsal } from "@azure/msal-react";
 *   import { apiScopes } from "./msalConfig";
 *
 *   export function useAuth() {
 *     const isAuthenticated = useIsAuthenticated();
 *     const { instance } = useMsal();
 *     return {
 *       isAuthenticated,
 *       login: () => instance.loginRedirect({ scopes: apiScopes }),
 *       logout: () => instance.logoutRedirect(),
 *     };
 *   }
 */
import { msalInstance } from "./msalConfig";
import { isEntraConfigured } from "./mode";

const SESSION_KEY = "vt_authed";

export function useAuth() {
  const entraMode = isEntraConfigured();
  const isAuthenticated = entraMode
    ? msalInstance.getAllAccounts().length > 0
    : sessionStorage.getItem(SESSION_KEY) === "1";

  const logout = () => {
    if (entraMode) {
      void msalInstance.logoutRedirect();
      return;
    }

    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  };

  return { isAuthenticated, logout };
}
