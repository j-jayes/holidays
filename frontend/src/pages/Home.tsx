import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "../auth/useAuth";
import { apiScopes } from "../auth/msalConfig";

const entraConfigured = Boolean(import.meta.env.VITE_ENTRA_CLIENT_ID);

/**
 * Landing page.
 * - With Entra ID: shows "Sign in with Microsoft" button.
 * - Without Entra ID (PasswordGate mode): immediately redirects to /dashboard
 *   since the user already authenticated via the password screen.
 */
export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // PasswordGate mode — already authed, skip this page
  useEffect(() => {
    if (!entraConfigured && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Entra ID mode
  const { instance } = useMsal();
  const handleLogin = () => {
    instance.loginRedirect({ scopes: apiScopes });
  };

  if (!entraConfigured) {
    // Render nothing while the redirect fires
    return null;
  }

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
