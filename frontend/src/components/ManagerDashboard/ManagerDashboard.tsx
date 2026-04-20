import { useState } from "react";
import toast from "react-hot-toast";
import type { LeaveRequest, User, BusinessUnit } from "../../types";
import { leaveRequestsApi } from "../../api/leaveRequests";

interface Props {
  pendingRequests: LeaveRequest[];
  users: User[];
  businessUnits: BusinessUnit[];
  onUpdate: () => void;
}

// ─── Label / colour helpers ───────────────────────────────────────────────────

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

/** Days between submittedAt and now — approximated from startDate as a fallback
 *  since we don't store a createdAt field yet. When MSAL rolls out and we enrich
 *  the user record, we can replace this with a real createdAt timestamp. */
function pendingAgeDays(req: LeaveRequest): number {
  // Requests don't store createdAt; use startDate as a rough signal for now.
  // TODO: switch to req.createdAt once that field is added to the schema.
  const ref = new Date(req.startDate);
  const today = new Date();
  return Math.max(0, Math.round((today.getTime() - ref.getTime()) / 86_400_000));
}

// ─── Recent-decision type ─────────────────────────────────────────────────────

interface Decision {
  requestId: string;
  snapshot: LeaveRequest;
  userName: string;
  action: "approved" | "denied";
  decidedAt: number; // Date.now()
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MAX_DECISIONS = 20;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ManagerDashboard({ pendingRequests, users, businessUnits, onUpdate }: Props) {
  const [loading,         setLoading]         = useState<string | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([]);
  const [decisionsOpen,   setDecisionsOpen]   = useState(true);

  const userMap = new Map(users.map((u) => [u.id, u]));

  // ── Core approve / deny handler ─────────────────────────────────────────────
  const handle = async (req: LeaveRequest, action: "approve" | "deny") => {
    const user    = userMap.get(req.userId);
    const name    = user?.displayName ?? req.userId;

    setLoading(req.id + action);
    try {
      if (action === "approve") {
        await leaveRequestsApi.update(req.id, { status: "B" });
        toast.success(`Approved — ${name}`);
      } else {
        await leaveRequestsApi.update(req.id, { status: "C" });
        toast.success(`Denied — ${name}`);
      }

      // Record the decision (cap list + trim old entries)
      const decision: Decision = {
        requestId: req.id,
        snapshot:  { ...req },
        userName:  name,
        action:    action === "approve" ? "approved" : "denied",
        decidedAt: Date.now(),
      };
      setRecentDecisions((prev) => {
        const fresh = prev.filter((d) => Date.now() - d.decidedAt < TWO_HOURS_MS);
        return [decision, ...fresh].slice(0, MAX_DECISIONS);
      });

      onUpdate();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  };

  // ── Bulk approve all pending in a BU ────────────────────────────────────────
  const handleBulkApprove = async (buId: string, buName: string, requests: LeaveRequest[]) => {
    if (requests.length === 0) return;
    setLoading("bulk-" + buId);
    let ok = 0;
    for (const req of requests) {
      try {
        await leaveRequestsApi.update(req.id, { status: "B" });
        const user = userMap.get(req.userId);
        const name = user?.displayName ?? req.userId;
        const decision: Decision = {
          requestId: req.id,
          snapshot:  { ...req },
          userName:  name,
          action:    "approved",
          decidedAt: Date.now(),
        };
        setRecentDecisions((prev) => {
          const fresh = prev.filter((d) => Date.now() - d.decidedAt < TWO_HOURS_MS);
          return [decision, ...fresh].slice(0, MAX_DECISIONS);
        });
        ok++;
      } catch {
        // continue — individual failures don't halt the batch
      }
    }
    toast.success(`Approved ${ok} of ${requests.length} in ${buName}`);
    setLoading(null);
    onUpdate();
  };

  // ── Undo a decision ─────────────────────────────────────────────────────────
  const handleUndo = async (decision: Decision) => {
    try {
      await leaveRequestsApi.update(decision.requestId, { status: "A" });
      setRecentDecisions((prev) => prev.filter((d) => d.requestId !== decision.requestId));
      toast.success(`Undone — ${decision.userName} is pending again`);
      onUpdate();
    } catch {
      toast.error("Undo failed");
    }
  };

  // ── Grouped by BU ───────────────────────────────────────────────────────────
  const buColumns = businessUnits.map((bu) => ({
    ...bu,
    requests: pendingRequests.filter((r) => r.businessUnitId === bu.id),
  }));

  // Requests not matched to any known BU (edge case)
  const unassigned = pendingRequests.filter(
    (r) => !businessUnits.some((bu) => bu.id === r.businessUnitId),
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* ── Pending requests by BU ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-gray-800 flex-1">
            Pending requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#f0e6fb] text-nexer-purple text-xs font-bold">
                {pendingRequests.length}
              </span>
            )}
          </h2>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-sm">All caught up! No pending requests.</p>
          </div>
        ) : (
          <div
            className="grid gap-4 overflow-x-auto"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, buColumns.length + (unassigned.length > 0 ? 1 : 0))}, minmax(220px, 1fr))` }}
          >
            {buColumns.map((bu) => (
              <BuColumn
                key={bu.id}
                bu={bu}
                userMap={userMap}
                loading={loading}
                onHandle={handle}
                onBulkApprove={handleBulkApprove}
              />
            ))}
            {unassigned.length > 0 && (
              <BuColumn
                key="__unassigned"
                bu={{ id: "__unassigned", name: "Unassigned", managerUserId: "", requests: unassigned }}
                userMap={userMap}
                loading={loading}
                onHandle={handle}
                onBulkApprove={handleBulkApprove}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Recent Decisions ────────────────────────────────────────────── */}
      {recentDecisions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-bold text-gray-800 flex-1">Recent Decisions</h2>
            <button
              onClick={() => setDecisionsOpen((v) => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {decisionsOpen ? "▲ Hide" : "▼ Show"}
            </button>
          </div>
          {decisionsOpen && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentDecisions.map((d) => (
                <DecisionCard key={d.requestId + d.decidedAt} decision={d} onUndo={handleUndo} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BU column sub-component ─────────────────────────────────────────────────

interface BuColumnProps {
  bu: BusinessUnit & { requests: LeaveRequest[] };
  userMap: Map<string, User>;
  loading: string | null;
  onHandle: (req: LeaveRequest, action: "approve" | "deny") => void;
  onBulkApprove: (buId: string, buName: string, requests: LeaveRequest[]) => void;
}

function BuColumn({ bu, userMap, loading, onHandle, onBulkApprove }: BuColumnProps) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between gap-1">
        <div>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{bu.name}</span>
          {bu.requests.length > 0 && (
            <span className="ml-1.5 text-xs text-gray-400">({bu.requests.length})</span>
          )}
        </div>
        {bu.requests.length > 1 && (
          <button
            disabled={loading !== null}
            onClick={() => onBulkApprove(bu.id, bu.name, bu.requests)}
            className="shrink-0 px-2 py-0.5 rounded-lg bg-nexer-light-blue text-nexer-blue text-xs font-semibold hover:bg-nexer-blue hover:text-white disabled:opacity-50 transition-colors"
          >
            Approve all
          </button>
        )}
      </div>

      {/* Cards */}
      {bu.requests.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-4 text-center">No pending requests</p>
      ) : (
        bu.requests.map((req) => (
          <RequestCard
            key={req.id}
            req={req}
            user={userMap.get(req.userId)}
            loading={loading}
            onHandle={onHandle}
          />
        ))
      )}
    </div>
  );
}

// ─── Single request card ─────────────────────────────────────────────────────

interface RequestCardProps {
  req: LeaveRequest;
  user: User | undefined;
  loading: string | null;
  onHandle: (req: LeaveRequest, action: "approve" | "deny") => void;
}

function RequestCard({ req, user, loading, onHandle }: RequestCardProps) {
  const name    = user?.displayName ?? req.userId;
  const ageDays = pendingAgeDays(req);

  return (
    <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nexer-light-purple to-nexer-purple flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{name}</p>
          <p className="text-xs text-gray-500">{req.startDate} &rarr; {req.endDate}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CLS[req.leaveType] ?? "bg-gray-100 text-gray-600"}`}>
          {TYPE_LABEL[req.leaveType] ?? req.leaveType}
        </span>
      </div>

      {/* Balance row */}
      {user && (
        <div className="flex gap-3 text-xs text-gray-500">
          <span>Balance: <strong className="text-gray-700">{user.annualLeaveBalance}d</strong></span>
          {user.compTimeBalance > 0 && (
            <span>Comp: <strong className="text-gray-700">{user.compTimeBalance}d</strong></span>
          )}
        </div>
      )}

      {/* Pending age badge */}
      {ageDays >= 3 && (
        <span className="self-start px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
          Waiting {ageDays}d
        </span>
      )}

      {req.notes && (
        <p className="text-xs text-gray-500 italic">"{req.notes}"</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onHandle(req, "approve")}
          disabled={loading !== null}
          className="flex-1 py-1.5 rounded-lg bg-nexer-blue text-white text-xs font-semibold hover:bg-[#0d0460] disabled:opacity-60 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onHandle(req, "deny")}
          disabled={loading !== null}
          className="flex-1 py-1.5 rounded-lg bg-[#ffecea] text-nexer-warm-red text-xs font-semibold hover:bg-[#ffd5cf] disabled:opacity-60 transition-colors"
        >
          Deny
        </button>
      </div>
    </div>
  );
}

// ─── Recent decision card ─────────────────────────────────────────────────────

interface DecisionCardProps {
  decision: Decision;
  onUndo: (d: Decision) => void;
}

function DecisionCard({ decision, onUndo }: DecisionCardProps) {
  const approved = decision.action === "approved";
  const time = new Date(decision.decidedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={`shrink-0 w-52 rounded-xl border p-3 flex flex-col gap-2
        ${approved ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0
          ${approved ? "bg-green-500" : "bg-red-400"}`}>
          {initials(decision.userName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-800 truncate">{decision.userName}</p>
          <p className="text-xs text-gray-500">{decision.snapshot.startDate} → {decision.snapshot.endDate}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className={`text-xs font-medium ${approved ? "text-green-700" : "text-red-600"}`}>
          {approved ? "✓ Approved" : "✗ Denied"} · {time}
        </span>
        <button
          onClick={() => onUndo(decision)}
          className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2 shrink-0"
        >
          Undo
        </button>
      </div>
    </div>
  );
}

