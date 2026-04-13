import { useMsal } from "@azure/msal-react";
import { apiScopes } from "../auth/msalConfig";

/**
 * Landing page — shown before the user logs in.
 */
export default function Home() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect({ scopes: apiScopes });
  };

  return (
    <div style={{ textAlign: "center", marginTop: "10vh", fontFamily: "sans-serif" }}>
      <h1>🏖️ Team Vacation Tracker</h1>
      <p>Plan your time off, view your team's availability, and get manager approvals — all in one place.</p>
      <button
        onClick={handleLogin}
        style={{
          marginTop: "2rem",
          padding: "12px 28px",
          fontSize: "1rem",
          background: "#0078d4",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Sign in with Microsoft
      </button>
    </div>
  );
}
