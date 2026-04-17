import apiClient from "./client";
import type { BusinessUnit } from "../types";

function asBusinessUnitArray(value: unknown): BusinessUnit[] {
  if (Array.isArray(value)) return value as BusinessUnit[];
  throw new Error(`Unexpected business-units payload (expected array): ${JSON.stringify(value)}`);
}

export const businessUnitsApi = {
  list: (): Promise<BusinessUnit[]> =>
    apiClient.get<BusinessUnit[]>("/api/v1/business-units").then((r) => asBusinessUnitArray(r.data)),
};
