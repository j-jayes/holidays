import apiClient from "./client";
import type { LeaveRequest, LeaveRequestCreate, LeaveRequestUpdate } from "../types";

function asLeaveRequestArray(value: unknown): LeaveRequest[] {
  if (Array.isArray(value)) return value as LeaveRequest[];
  throw new Error(`Unexpected leave-requests payload (expected array): ${JSON.stringify(value)}`);
}

export const leaveRequestsApi = {
  list: (): Promise<LeaveRequest[]> =>
    apiClient
      .get<LeaveRequest[]>("/api/v1/leave-requests")
      .then((r) => asLeaveRequestArray(r.data)),
  get: (id: string): Promise<LeaveRequest> =>
    apiClient.get<LeaveRequest>(`/api/v1/leave-requests/${id}`).then((r) => r.data),
  create: (payload: LeaveRequestCreate): Promise<LeaveRequest> =>
    apiClient
      .post<LeaveRequest>("/api/v1/leave-requests", {
        user_id: payload.userId,
        start_date: payload.startDate,
        end_date: payload.endDate,
        leave_type: payload.leaveType,
        notes: payload.notes ?? "",
      })
      .then((r) => r.data),
  update: (id: string, payload: LeaveRequestUpdate): Promise<LeaveRequest> =>
    apiClient
      .patch<LeaveRequest>(`/api/v1/leave-requests/${id}`, {
        status: payload.status,
        notes: payload.notes ?? "",
      })
      .then((r) => r.data),
  cancel: (id: string): Promise<void> =>
    apiClient.delete(`/api/v1/leave-requests/${id}`).then(() => undefined),
};
