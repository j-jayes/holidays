/**
 * Returns the base URL for API calls.
 *
 * By default this returns "" so all requests use relative URLs (e.g. "/api/v1/…").
 * Both the Vite dev-server proxy and the production nginx reverse-proxy will
 * forward these to the backend automatically.
 *
 * Set VITE_API_BASE_URL only if you need to bypass the proxy and hit the
 * backend directly (e.g. for debugging).
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
}