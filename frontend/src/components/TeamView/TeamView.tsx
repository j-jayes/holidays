import dayjs from "dayjs";
import type { LeaveRequest, User } from "../../types";

interface Props {
  teamLeaveRequests: LeaveRequest[];
  users: User[];
}

const TYPE_LABEL: Record<string, string> = { A: "Vacation", FL: "Parental", C: "Comp", B: "Approved" };
const TYPE_CLS:   Record<string, string> = {
  A:  "bg-amber-100 text-amber-700",
  FL: "bg-sky-100 text-sky-700",
  C:  "bg-violet-100 text-violet-700",
  B:  "bg-emerald-100 text-emerald-700",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function avatarBg(id: string) {
  const colours = ["from-rose-400 to-pink-500", "from-amber-400 to-orange-500", "from-emerald-400 to-teal-500", "from-sky-400 to-blue-500", "from-violet-400 to-purple-500", "from-fuchsia-400 to-pink-500"];
  const idx = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colours.length;
  return colours[idx];
}

export default function TeamView({ teamLeaveRequests, users }: Props) {
  const userMap = new Map(users.map((u) => [u.id, u]));

  const upcoming = [...teamLeaveRequests]
    .filter((r) => r.status === "B" || r.status === "A")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Team availability</h2>

      {upcoming.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No upcoming leave found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map((req) => {
            const user = userMap.get(req.userId);
            const name = user?.displayName ?? req.userId;
            const isNow = dayjs().isBefore(dayjs(req.endDate)) && dayjs().isAfter(dayjs(req.startDate).subtract(1, "day"));
            return (
              <div key={req.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarBg(req.userId)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {initials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                  <p className="text-xs text-gray-500">{req.startDate} &rarr; {req.endDate}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CLS[req.leaveType] ?? "bg-gray-100 text-gray-600"}`}>
                  {TYPE_LABEL[req.leaveType] ?? req.leaveType}
                </span>
                {isNow && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-600 text-xs font-medium">Now</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
