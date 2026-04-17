import { useState, useEffect } from "react";
import apiClient from "../api/client";
import type { PublicHoliday } from "../types";

/**
 * Fetches public holidays from the backend (which proxies Nager.Date).
 * Results are cached in sessionStorage so repeated mounts (e.g. tab
 * switches) never trigger an extra network call within the same browser
 * session. A hard reload clears the cache naturally.
 *
 * @param countryCode - ISO 3166-1 alpha-2 code, e.g. "SE" or "PL"
 * @param year        - Calendar year, e.g. 2025
 */

function sessionKey(countryCode: string, year: number) {
  return `public-holidays-${countryCode.toUpperCase()}-${year}`;
}

function asHolidayArray(value: unknown): PublicHoliday[] {
  if (Array.isArray(value)) return value as PublicHoliday[];
  console.error("Unexpected public-holidays payload (expected array):", value);
  return [];
}

export function usePublicHolidays(countryCode: string, year: number) {
  const [holidays, setHolidays] = useState<PublicHoliday[]>(() => {
    // Populate from cache synchronously so first render already has data
    try {
      const cached = sessionStorage.getItem(sessionKey(countryCode, year));
      if (cached) return asHolidayArray(JSON.parse(cached));
    } catch {
      // sessionStorage unavailable or JSON invalid — fall through
    }
    return [];
  });
  const [loading, setLoading] = useState(holidays.length === 0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const key = sessionKey(countryCode, year);

    // Already populated from sessionStorage — skip the network call
    try {
      const cached = sessionStorage.getItem(key);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setHolidays(parsed as PublicHoliday[]);
          setLoading(false);
          return;
        }

        // Bad cache shape from old data; clear and refetch.
        sessionStorage.removeItem(key);
      }
    } catch {
      // sessionStorage unavailable — proceed with network call
    }

    setLoading(true);
    apiClient
      .get<PublicHoliday[]>(`/api/v1/public-holidays/${countryCode}/${year}`)
      .then((r) => {
        const safe = asHolidayArray(r.data);
        setHolidays(safe);
        try {
          sessionStorage.setItem(key, JSON.stringify(safe));
        } catch {
          // Quota exceeded or storage unavailable — silently ignore
        }
      })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  }, [countryCode, year]);

  return { holidays, loading, error };
}
