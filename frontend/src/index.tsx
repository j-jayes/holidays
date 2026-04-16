import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth/msalConfig";
import PasswordGate from "./components/PasswordGate/PasswordGate";
import App from "./App";
import "./index.css";

const entraConfigured = Boolean(import.meta.env.VITE_ENTRA_CLIENT_ID);

// TODO: Once Entra ID is configured, remove PasswordGate and the entraConfigured
// guard — MsalProvider + useIsAuthenticated will handle auth entirely.
const AppTree = entraConfigured ? (
  <MsalProvider instance={msalInstance}>
    <App />
  </MsalProvider>
) : (
  <PasswordGate>
    <App />
  </PasswordGate>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{AppTree}</React.StrictMode>
);
