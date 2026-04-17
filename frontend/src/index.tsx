import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth/msalConfig";
import { isEntraConfigured } from "./auth/mode";
import PasswordGate from "./components/PasswordGate/PasswordGate";
import App from "./App";
import "./index.css";

const entraConfigured = isEntraConfigured();

// Keep MsalProvider mounted in every mode so auth hooks remain valid.
const AppTree = (
  <MsalProvider instance={msalInstance}>
    {entraConfigured ? (
      <App />
    ) : (
      <PasswordGate>
        <App />
      </PasswordGate>
    )}
  </MsalProvider>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{AppTree}</React.StrictMode>
);
