import { NavLink, useNavigate } from "react-router-dom";

const items = [
  { to: "/home", label: "Home", icon: "🌐" },
  { to: "/leaderboard", label: "Ranks", icon: "🏆" },
  { to: "/report", label: "Report", icon: "➕", primary: true },
  { to: "/notifications", label: "Alerts", icon: "🔔" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

export default function BottomNav() {
  const nav = useNavigate();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md">
      <div className="glass mx-3 mb-3 flex items-center justify-around rounded-2xl px-2 py-1">
        {items.map((it) =>
          it.primary ? (
            <button
              key={it.to}
              onClick={() => nav("/report")}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-2xl text-midnight shadow-glow"
              aria-label="Report an issue"
            >
              {it.icon}
            </button>
          ) : (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-xs ${
                  isActive ? "text-teal" : "text-gray-400"
                }`
              }
            >
              <span className="text-lg">{it.icon}</span>
              <span>{it.label}</span>
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
}
