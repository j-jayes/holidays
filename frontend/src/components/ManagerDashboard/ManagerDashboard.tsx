import type { LeaveRequest } from "../../types";
import { leaveRequestsApi } from "../../api/leaveRequests";

interface ManagerDashboardProps {
  pendingRequests: LeaveRequest[];
  onUpdate: () => void;
}

/**
 * Manager Dashboard — review and approve / deny pending leave requests.
 */
export default function ManagerDashboard({
  pendingRequests,
  onUpdate,
}: ManagerDashboardProps) {
  const handleApprove = async (id: string) => {
    await leaveRequestsApi.update(id, { status: "B" });
    onUpdate();
  };

  const handleDeny = async (id: string) => {
    await leaveRequestsApi.cancel(id);
    onUpdate();
  };

  return (
    <div className="manager-dashboard">
      <h2>Pending Leave Requests</h2>
      {pendingRequests.length === 0 ? (
        <p>No pending requests 🎉</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Employee", "From", "To", "Type", "Notes", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((req) => (
              <tr key={req.id}>
                <td style={{ padding: "8px" }}>{req.userId}</td>
                <td style={{ padding: "8px" }}>{req.startDate}</td>
                <td style={{ padding: "8px" }}>{req.endDate}</td>
                <td style={{ padding: "8px" }}>{req.leaveType}</td>
                <td style={{ padding: "8px" }}>{req.notes || "—"}</td>
                <td style={{ padding: "8px", display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleApprove(req.id)}
                    style={{ background: "#28a745", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDeny(req.id)}
                    style={{ background: "#dc3545", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}
                  >
                    Deny
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
