import apiClient from "./client";
import type { BusinessUnit } from "../types";

export const businessUnitsApi = {
  list: (): Promise<BusinessUnit[]> =>
    apiClient.get<BusinessUnit[]>("/api/v1/business-units").then((r) => r.data),
};
