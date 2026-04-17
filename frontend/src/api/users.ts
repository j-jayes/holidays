import apiClient from "./client";
import type { User } from "../types";

function asUserArray(value: unknown): User[] {
  if (Array.isArray(value)) return value as User[];
  throw new Error(`Unexpected users payload (expected array): ${JSON.stringify(value)}`);
}

export const usersApi = {
  list: (): Promise<User[]> =>
    apiClient.get<User[]>("/api/v1/users").then((r) => asUserArray(r.data)),
  get: (id: string): Promise<User> =>
    apiClient.get<User>(`/api/v1/users/${id}`).then((r) => r.data),
};
