import apiClient from "./client";
import type { User } from "../types";

export const usersApi = {
  list: (): Promise<User[]> =>
    apiClient.get<User[]>("/api/v1/users").then((r) => r.data),
  get: (id: string): Promise<User> =>
    apiClient.get<User>(`/api/v1/users/${id}`).then((r) => r.data),
};
