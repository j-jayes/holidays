import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAccount } from "@azure/msal-react";
import Calendar from "../components/Calendar/Calendar";
import TeamView from "../components/TeamView/TeamView";
import ManagerDashboard from "../components/ManagerDashboard/ManagerDashboard";
import { usePublicHolidays } from "../hooks/usePublicHolidays";
import { leaveRequestsApi } from "../api/leaveRequests";
import type { LeaveRequest } from "../types";

/**
 * Main authenticated dashboard — contains the calendar, team view, and
 * (conditionally) the manager approval panel.
 */
export default function Dashboard() {
  const account = useAccount();
  const currentYear = new Date().getFullYear();
  const { holidays } = usePublicHolidays("SE", currentYear);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showTeamView, setShowTeamView] = useState(false);

  const loadRequests = () => {
    leaveRequestsApi.list().then(setLeaveRequests).catch(console.error);
  };

  useEffect(() => { loadRequests(); }, []);

  const pendingRequests = leaveRequests.filter((r) => r.status === "A");
  const isManager = (account?.idTokenClaims as Record<string, unknown>)?.roles
    ? ((account?.idTokenClaims as Record<string, string[]>).roles ?? []).includes("Manager")
    : false;

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>My Calendar</h1>
      <button
        onClick={() => setShowTeamView((v) => !v)}
        style={{ marginBottom: "1rem" }}
      >
        {showTeamView ? "Hide Team View" : "Show Team View"}
      </button>

      <Routes>
        <Route
          path="/"
          element={
            <>
              <Calendar
                leaveRequests={leaveRequests}
                publicHolidays={holidays}
                onRangeSelect={(start, end) => {
                  // TODO: open a modal to confirm the leave request
                  console.log("Selected range:", start, "→", end);
                }}
              />
              {showTeamView && (
                <TeamView teamLeaveRequests={leaveRequests} users={[]} />
              )}
              {isManager && (
                <ManagerDashboard
                  pendingRequests={pendingRequests}
                  onUpdate={loadRequests}
                />
              )}
            </>
          }
        />
      </Routes>
    </div>
  );
}
