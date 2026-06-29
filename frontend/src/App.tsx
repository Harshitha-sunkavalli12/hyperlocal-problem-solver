import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import BottomNav from "./components/BottomNav";
import Login from "./pages/Login";
import OfficialLogin from "./pages/OfficialLogin";
import Home from "./pages/Home";
import Report from "./pages/Report";
import IssueDetail from "./pages/IssueDetail";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Notifications from "./pages/Notifications";
import Dashboard from "./pages/Dashboard";
import GlassDemo from "./pages/GlassDemo";
import { isAuthed, isOfficial } from "./lib/auth";

function Protected({ children }: { children: JSX.Element }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

function OfficialOnly({ children }: { children: JSX.Element }) {
  return isOfficial() ? children : <Navigate to="/official-login" replace />;
}

export default function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");
  const isOfficialLogin = location.pathname === "/official-login";
  const isGlassDemo = location.pathname === "/glass-demo";
  const fullWidth = isDashboard || isOfficialLogin || isGlassDemo;
  const hideNav =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    isOfficialLogin ||
    isDashboard ||
    isGlassDemo;

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-midnight ${
        fullWidth ? "w-full" : "mx-auto max-w-md"
      }`}
    >
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/official-login" element={<OfficialLogin />} />
          <Route path="/glass-demo" element={<GlassDemo />} />
          <Route path="/home" element={<Protected><Home /></Protected>} />
          <Route path="/report" element={<Protected><Report /></Protected>} />
          <Route path="/issue/:id" element={<Protected><IssueDetail /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
          <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
          <Route path="/dashboard" element={<OfficialOnly><Dashboard /></OfficialOnly>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
      {!hideNav && <BottomNav />}
    </div>
  );
}
