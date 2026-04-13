import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useIsAuthenticated } from "@azure/msal-react";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {isAuthenticated && (
          <Route path="/dashboard/*" element={<Dashboard />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
