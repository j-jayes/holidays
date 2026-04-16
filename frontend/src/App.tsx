import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { isAuthenticated } = useAuth();

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
