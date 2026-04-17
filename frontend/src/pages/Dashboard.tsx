import { useState, useEffect, useRef, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import Calendar from "../components/Calendar/Calendar";
import ManagerDashboard from "../components/ManagerDashboard/ManagerDashboard";
import LeaveRequestModal from "../components/LeaveRequestModal/LeaveRequestModal";
import { usePublicHolidays } from "../hooks/usePublicHolidays";
import { leaveRequestsApi } from "../api/leaveRequests";
import { usersApi } from "../api/users";
import { businessUnitsApi } from "../api/businessUnits";
import type { LeaveRequest, User, BusinessUnit } from "../types";

const MAX_RETRIES = 8;
const RETRY_DELAY_MS = 3000;

type LoadState = "loading" | "retrying" | "ok" | "error";

export default function Dashboard() {
  const currentYear = new Date().getFullYear();

  // Fetch holidays for current + next year in case 6-month window spans the boundary
  const { holidays: hCurrent } = usePublicHolidays("SE", currentYear);
  const { holidays: hNext    } = usePublicHolidays("SE", currentYear + 1);
  const holidays = [...hCurrent, ...hNext];

  const [leaveRequests,  setLeaveRequests]  = useState<LeaveRequest[]>([]);
  const [users,          setUsers]          = useState<User[]>([]);
  const [businessUnits,  setBusinessUnits]  = useState<BusinessUnit[]>([]);
  const [tab,            setTab]            = useState<"calendar" | "manager">("calendar");
  const [modalRange,     setModalRange]     = useState<{ start: string; end: string; uid?: string } | null>(null);
  const [loadState,      setLoadState]      = useState<LoadState>("loading");
  const [retryCount,     setRetryCount]     = useState(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reload only leave requests (for modal submit / approval actions)
  const reloadLeave = () => leaveRequestsApi.list().then(setLeaveRequests).catch(console.error);

  const loadAll = useCallback(async (attempt = 0) => {
    try {
      const [fetchedUsers, fetchedBUs, fetchedLeave] = await Promise.all([
        usersApi.list(),
        businessUnitsApi.list(),
        leaveRequestsApi.list(),
      ]);
      setUsers(fetchedUsers);
      setBusinessUnits(fetchedBUs);
      setLeaveRequests(fetchedLeave);
      setLoadState("ok");
      setRetryCount(0);
    } catch {
      if (attempt < MAX_RETRIES) {
        setLoadState("retrying");
        setRetryCount(attempt + 1);
        retryTimer.current = setTimeout(() => loadAll(attempt + 1), RETRY_DELAY_MS);
      } else {
        setLoadState("error");
      }
    }
  }, []);

  useEffect(() => {
    loadAll();
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, [loadAll]);

  const pendingRequests = leaveRequests.filter((r) => r.status === "A");

  const TABS = [
    { key: "calendar", label: "Team Calendar" },
    { key: "manager",  label: `Approvals${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}` },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-nexer-light-blue flex flex-col">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: "12px", fontFamily: "inherit" } }} />

      {/* ── Wake-up banner ─────────────────────────────────────────────────── */}
      {(loadState === "loading" || loadState === "retrying" || loadState === "error") && (
        <div
          className={`sticky top-0 z-50 flex items-center gap-3 px-4 py-2.5 text-sm font-medium
            ${loadState === "error"
              ? "bg-[#ffecea] border-b border-nexer-warm-red/30 text-nexer-warm-red"
              : "bg-[#fff2ed] border-b border-nexer-orange/30 text-[#a0410e]"}`}
        >
          {loadState !== "error" ? (
            /* Spinning circle */
            <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          ) : (
            <span className="shrink-0 text-base">⚠️</span>
          )}

          {loadState === "loading" && "Backend is waking up — loading data…"}
          {loadState === "retrying" && `Backend is waking up — retrying… (attempt ${retryCount} of ${MAX_RETRIES})`}
          {loadState === "error"   && (
            <>
              Failed to connect to backend.&nbsp;
              <button
                onClick={() => { setLoadState("loading"); setRetryCount(0); loadAll(); }}
                className="underline underline-offset-2 hover:no-underline"
              >
                Try again
              </button>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">&#127958;&#65039;</span>
          <span className="font-bold text-gray-800 text-lg flex-1">Team Vacation Tracker</span>
          <nav className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col px-4 py-4 gap-4 min-h-0">
        {tab === "calendar" && (
          <Calendar
            leaveRequests={leaveRequests}
            publicHolidays={holidays}
            users={users}
            businessUnits={businessUnits}
            onRangeSelect={(start, end, uid) => setModalRange({ start, end, uid })}
          />
        )}
        {tab === "manager" && (
          <ManagerDashboard
            pendingRequests={pendingRequests}
            users={users}
            onUpdate={reloadLeave}
          />
        )}
      </main>

      {/* Leave request modal */}
      {modalRange && (
        <LeaveRequestModal
          isOpen
          onClose={() => setModalRange(null)}
          startDate={modalRange.start}
          endDate={modalRange.end}
          users={users}
          preselectedUserId={modalRange.uid}
          onSubmitted={reloadLeave}
        />
      )}
    </div>
  );
}
