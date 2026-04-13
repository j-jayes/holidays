import { useState, useEffect } from "react";
import apiClient from "../api/client";
import type { PublicHoliday } from "../types";

/**
 * Fetches public holidays from the backend (which proxies Nager.Date).
 *
 * @param countryCode - ISO 3166-1 alpha-2 code, e.g. "SE" or "PL"
 * @param year        - Calendar year, e.g. 2025
 */
export function usePublicHolidays(countryCode: string, year: number) {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<PublicHoliday[]>(`/api/v1/public-holidays/${countryCode}/${year}`)
      .then((r) => setHolidays(r.data))
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  }, [countryCode, year]);

  return { holidays, loading, error };
}
