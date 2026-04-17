import { useState, useMemo } from "react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import type { User, LeaveStatus } from "../../types";
import { leaveRequestsApi } from "../../api/leaveRequests";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  users: User[];
  preselectedUserId?: string;
  onSubmitted: () => void;
}

const LEAVE_TYPES: { value: LeaveStatus; label: string; cls: string }[] = [
  { value: "A",  label: "Vacation",  cls: "bg-[#fff0ea] text-nexer-orange border-[#ffd0bb]" },
  { value: "FL", label: "Parental",  cls: "bg-nexer-light-blue text-nexer-blue border-nexer-blue/30" },
  { value: "C",  label: "Comp time", cls: "bg-[#f0e6fb] text-nexer-purple border-nexer-purple/30" },
];

function countWorkdays(start: string, end: string): number {
  let count = 0;
  let d = dayjs(start);
  const endD = dayjs(end);
  while (!d.isAfter(endD)) {
    const dow = d.day();
    if (dow !== 0 && dow !== 6) count++;
    d = d.add(1, "day");
  }
  return count;
}

export default function LeaveRequestModal({
  isOpen, onClose, startDate, endDate, users, preselectedUserId, onSubmitted,
}: Props) {
  const [userId,    setUserId]    = useState(preselectedUserId ?? "");
  const [leaveType, setLeaveType] = useState<LeaveStatus>("A");
  const [notes,     setNotes]     = useState("");
  const [loading,   setLoading]   = useState(false);

  // Reset when the modal opens with a new range
  const key = `${startDate}-${endDate}-${preselectedUserId ?? ""}`;

  const workdays = useMemo(() => countWorkdays(startDate, endDate), [startDate, endDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { toast.error("Please select your name"); return; }
    setLoading(true);
    try {
      await leaveRequestsApi.create({ userId, startDate, endDate, leaveType, notes });
      toast.success("Leave request submitted!");
      onSubmitted();
      onClose();
    } catch {
      toast.error("Failed to submit — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] animate-in slide-in-from-bottom-4">
      <div key={key} className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-lg leading-none"
        >
          &times;
        </button>

        <h2 className="text-base font-bold text-gray-800 mb-0.5 pr-6">New leave request</h2>

        {/* Date range */}
        <div className="flex items-center gap-2 mb-5 text-xs text-gray-500">
          <span className="font-mono">{startDate}</span>
          <span>&#8594;</span>
          <span className="font-mono">{endDate}</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-nexer-light-blue text-nexer-blue font-medium text-xs">
            {workdays} day{workdays !== 1 ? "s" : ""}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Your name
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-nexer-light-purple transition-colors"
            >
              <option value="">Select your name…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
              ))}
            </select>
          </div>

          {/* Leave type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Leave type
            </label>
            <div className="flex gap-2">
              {LEAVE_TYPES.map((lt) => (
                <button
                  key={lt.value}
                  type="button"
                  onClick={() => setLeaveType(lt.value)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border-2 transition-all
                    ${leaveType === lt.value ? lt.cls + " ring-2 ring-offset-1 ring-nexer-light-purple" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"}`}
                >
                  {lt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any extra context…"
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:border-nexer-light-purple transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-nexer-light-purple to-nexer-purple text-white font-semibold text-sm shadow-md hover:shadow-lg hover:from-[#9942e0] hover:to-[#4a1888] transition-all duration-200 disabled:opacity-60 active:scale-95"
          >
            {loading ? "Submitting…" : `Submit ${workdays} day${workdays !== 1 ? "s" : ""} of leave`}
          </button>
        </form>
      </div>
    </div>
  );
}
