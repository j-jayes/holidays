import axios from "axios";
import { msalInstance, apiScopes } from "../auth/msalConfig";
import { isEntraConfigured } from "../auth/mode";
import { getApiBaseUrl } from "./baseUrl";

const apiClient = axios.create({
  baseURL: getApiBaseUrl() || "/",
});

/** Attach a Bearer token to every outgoing request. */
apiClient.interceptors.request.use(async (config) => {
  if (!isEntraConfigured() || apiScopes.length === 0) {
    return config;
  }

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const result = await msalInstance.acquireTokenSilent({
        scopes: apiScopes,
        account: accounts[0],
      });
      config.headers.Authorization = `Bearer ${result.accessToken}`;
    } catch {
      // Keep request unauthenticated if silent token acquisition fails.
    }
  }
  return config;
});

export default apiClient;
