import axios from "axios";
import { msalInstance, apiScopes } from "../auth/msalConfig";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/",
});

/** Attach a Bearer token to every outgoing request. */
apiClient.interceptors.request.use(async (config) => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    const result = await msalInstance.acquireTokenSilent({
      scopes: apiScopes,
      account: accounts[0],
    });
    config.headers.Authorization = `Bearer ${result.accessToken}`;
  }
  return config;
});

export default apiClient;
