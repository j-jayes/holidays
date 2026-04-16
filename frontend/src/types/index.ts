// ─── Leave Request Types ──────────────────────────────────────────────────

/** Maps to the legacy Excel leave codes. */
export type LeaveStatus = "A" | "B" | "FL" | "C";

export interface LeaveRequest {
  id: string;
  userId: string;
  businessUnitId: string;
  startDate: string; // ISO 8601 date string
  endDate: string;
  leaveType: LeaveStatus;
  status: LeaveStatus;
  notes: string;
}

export interface LeaveRequestCreate {
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: LeaveStatus;
  notes?: string;
}

export interface LeaveRequestUpdate {
  status: LeaveStatus;
  notes?: string;
}

// ─── User Types ───────────────────────────────────────────────────────────

export type UserRole = "Employee" | "Manager" | "Admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  businessUnitId: string;
  annualLeaveBalance: number;
  compTimeBalance: number;
}

// ─── Business Unit Types ──────────────────────────────────────────────────

export interface BusinessUnit {
  id: string;
  name: string;
  managerUserId: string;
}

// ─── Public Holiday Types ─────────────────────────────────────────────────

export interface PublicHoliday {
  date: string; // ISO 8601
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
}
