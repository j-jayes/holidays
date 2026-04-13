import apiClient from "./client";
import type { LeaveRequest, LeaveRequestCreate, LeaveRequestUpdate } from "../types";

export const leaveRequestsApi = {
  list: (): Promise<LeaveRequest[]> =>
    apiClient.get<LeaveRequest[]>("/api/v1/leave-requests").then((r) => r.data),

  get: (id: string): Promise<LeaveRequest> =>
    apiClient.get<LeaveRequest>(`/api/v1/leave-requests/${id}`).then((r) => r.data),

  create: (payload: LeaveRequestCreate): Promise<LeaveRequest> =>
    apiClient.post<LeaveRequest>("/api/v1/leave-requests", payload).then((r) => r.data),

  update: (id: string, payload: LeaveRequestUpdate): Promise<LeaveRequest> =>
    apiClient
      .patch<LeaveRequest>(`/api/v1/leave-requests/${id}`, payload)
      .then((r) => r.data),

  cancel: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/leave-requests/${id}`).then(() => undefined),
};
