import { NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";

const LINKS = [
  { to: "/", label: "Predict", end: true },
  { to: "/compare", label: "Compare" },
  { to: "/batch", label: "Batch" },
  { to: "/insights", label: "Insights" },
  { to: "/history", label: "History" },
  { to: "/about", label: "About" },
];

export default function Navbar({ theme, onToggleTheme }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">🌾 Crop Recommendation</div>
      <div className="navbar-links">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </nav>
  );
}
