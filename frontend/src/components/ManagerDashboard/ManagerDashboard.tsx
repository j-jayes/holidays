import { useState } from "react";
import toast from "react-hot-toast";
import type { LeaveRequest, User } from "../../types";
import { leaveRequestsApi } from "../../api/leaveRequests";

interface Props {
  pendingRequests: LeaveRequest[];
  users: User[];
  onUpdate: () => void;
}

const TYPE_LABEL: Record<string, string> = { A: "Vacation", FL: "Parental", C: "Comp", B: "Approved" };
const TYPE_CLS:   Record<string, string> = {
  A:  "bg-[#fff0ea] text-nexer-orange",
  FL: "bg-nexer-light-blue text-nexer-blue",
  C:  "bg-[#f0e6fb] text-nexer-purple",
  B:  "bg-[#e5e1f3] text-nexer-blue",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const EXPORTS = [
  {
    label: "CSV — Tidy Data",
    description: "Flat table, one row per request. Opens directly in Excel.",
    href: `${API_BASE}/api/v1/exports/leave-requests.csv`,
    icon: "📊",
    filename: "leave-requests.csv",
  },
  {
    label: "JSON",
    description: "Machine-readable array, same enriched fields as the CSV.",
    href: `${API_BASE}/api/v1/exports/leave-requests.json`,
    icon: "{ }",
    filename: "leave-requests.json",
  },
  {
    label: "Excel Live Link (.iqy)",
    description: "Open once in Excel — then use Data → Refresh All to pull the latest data.",
    href: `${API_BASE}/api/v1/exports/leave-requests.iqy`,
    icon: "🔗",
    filename: "leave-requests.iqy",
  },
] as const;

export default function ManagerDashboard({ pendingRequests, users, onUpdate }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const handle = async (id: string, action: "approve" | "deny") => {
    setLoading(id + action);
    try {
      if (action === "approve") {
        await leaveRequestsApi.update(id, { status: "B" });
        toast.success("Request approved");
      } else {
        await leaveRequestsApi.cancel(id);
        toast.success("Request denied");
      }
      onUpdate();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">
        Pending requests
        {pendingRequests.length > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#f0e6fb] text-nexer-purple text-xs font-bold">
            {pendingRequests.length}
          </span>
        )}
      </h2>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">&#127881;</div>
          <p className="text-sm">All caught up! No pending requests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingRequests.map((req) => {
            const user = userMap.get(req.userId);
            const name = user?.displayName ?? req.userId;
            return (
              <div key={req.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                {/* Top row */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nexer-light-purple to-nexer-purple flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {initials(name)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm leading-tight">{name}</p>
                    <p className="text-xs text-gray-500">{req.startDate} &rarr; {req.endDate}</p>
                  </div>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CLS[req.leaveType] ?? "bg-gray-100 text-gray-600"}`}>
                    {TYPE_LABEL[req.leaveType] ?? req.leaveType}
                  </span>
                </div>

                {req.notes && (
                  <p className="text-xs text-gray-500 italic">"{req.notes}"</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handle(req.id, "approve")}
                    disabled={loading !== null}
                    className="flex-1 py-1.5 rounded-lg bg-nexer-blue text-white text-xs font-semibold hover:bg-[#0d0460] disabled:opacity-60 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handle(req.id, "deny")}
                    disabled={loading !== null}
                    className="flex-1 py-1.5 rounded-lg bg-[#ffecea] text-nexer-warm-red text-xs font-semibold hover:bg-[#ffd5cf] disabled:opacity-60 transition-colors"
                  >
                    Deny
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* ── Data Exports ──────────────────────────────────────────────────── */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Data Exports</h2>
      <p className="text-xs text-gray-400 mb-4">
        All leave requests — employee email, name, business unit, ISO dates, and status labels.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {EXPORTS.map((exp) => (
          <a
            key={exp.filename}
            href={exp.href}
            download={exp.filename}
            className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-4 hover:border-nexer-light-purple/40 hover:bg-[#f5eefe] transition-colors group no-underline"
          >
            <span className="text-2xl leading-none">{exp.icon}</span>
            <span className="font-semibold text-sm text-gray-800 group-hover:text-nexer-purple transition-colors">
              {exp.label}
            </span>
            <span className="text-xs text-gray-400 leading-snug">{exp.description}</span>
          </a>
        ))}
      </div>
    </div>
  </div>
);
}
