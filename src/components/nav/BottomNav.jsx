// Fixed tab bar at the bottom of the screen. CSS only shows it on phones (<= 768px).
import { NavLink } from "react-router-dom";
import { Home, Compass, CalendarClock, LayoutGrid, Bookmark } from "lucide-react";

const TABS = [
  ["/", "Home", Home, true],
  ["/browse", "Browse", Compass, false],
  ["/airing", "Airing", CalendarClock, false],
  ["/genres", "Genres", LayoutGrid, false],
  ["/my-list", "My List", Bookmark, false],
];

export default function BottomNav() {
  return (
    <nav className="nv-bottom" aria-label="Mobile">
      {TABS.map(([to, label, Icon, end]) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => "nv-tab" + (isActive ? " is-active" : "")}>
          <Icon className="icon" aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
