import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Stethoscope,
  Users,
} from "lucide-react";
import { NavLink } from "react-router";

import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/visits", label: "Visit Log", icon: CalendarDays },
  { to: "/doctors", label: "Doctors", icon: Stethoscope },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={[styles.sidebar, collapsed ? styles.collapsed : ""].join(" ")}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>℞</span>
        {!collapsed && (
          <span className={styles.brandText}>
            Digital<strong>Prescription</strong>
          </span>
        )}
      </div>

      <nav className={styles.nav} aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.navItemActive : ""].join(" ")
            }
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
          >
            <Icon size={19} strokeWidth={2} aria-hidden="true" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className={styles.collapseBtn}
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
