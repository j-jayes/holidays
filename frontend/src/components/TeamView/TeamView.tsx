import type { LeaveRequest, User } from "../../types";

interface TeamViewProps {
  teamLeaveRequests: LeaveRequest[];
  users: User[];
}

/**
 * Read-only calendar showing the whole team's approved leave.
 * Employees use this to check coverage before requesting their own time off.
 */
export default function TeamView({ teamLeaveRequests, users }: TeamViewProps) {
  const userMap = new Map(users.map((u) => [u.id, u]));

  const approvedRequests = teamLeaveRequests.filter((r) => r.status === "B");

  return (
    <div className="team-view">
      <h2>Team Availability</h2>
      {approvedRequests.length === 0 ? (
        <p>No approved leave in this period.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}>
                Employee
              </th>
              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}>
                From
              </th>
              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}>
                To
              </th>
              <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}>
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {approvedRequests.map((req) => {
              const user = userMap.get(req.userId);
              return (
                <tr key={req.id}>
                  <td style={{ padding: "8px" }}>{user?.displayName ?? req.userId}</td>
                  <td style={{ padding: "8px" }}>{req.startDate}</td>
                  <td style={{ padding: "8px" }}>{req.endDate}</td>
                  <td style={{ padding: "8px" }}>{req.leaveType}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
