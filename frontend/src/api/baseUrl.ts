const devApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export function getApiBaseUrl(): string {
  return import.meta.env.DEV ? devApiBaseUrl : "";
}