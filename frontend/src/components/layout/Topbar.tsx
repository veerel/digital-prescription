import { ChevronDown, KeyRound, LogOut, Plus, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAuth } from "@/features/auth/AuthContext";
import { ChangePasswordModal } from "@/features/auth/ChangePasswordModal";
import { usePatients } from "@/features/patients/api";
import { genderLabel } from "@/lib/formatters";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

import styles from "./Topbar.module.css";

const TITLES = [
  { prefix: "/dashboard", title: "Dashboard", subtitle: "Overview of your clinic, today" },
  { prefix: "/patients", title: "Patients", subtitle: "Search records & manage prescriptions" },
  {
    prefix: "/visits",
    title: "Visit Log",
    subtitle: "Every patient visit — who came in, when, and which doctor they saw",
  },
  { prefix: "/doctors", title: "Doctors", subtitle: "Manage your care team" },
];

function QuickSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim());
  const { data } = usePatients({ q, limit: 6 }, { enabled: q.length > 0 });
  const results = q && query.trim() ? (data?.items ?? []) : [];

  useEffect(() => {
    // "/" focuses search, like the prototype.
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.searchBlock}>
      <SearchInput
        inputRef={inputRef}
        value={query}
        onChange={setQuery}
        placeholder="Search patients..."
        label="Search patients"
      />
      {results.length > 0 && (
        <div className={styles.results} role="listbox" aria-label="Matching patients">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={false}
              className={styles.resultRow}
              onClick={() => {
                navigate(`/patients/${p.id}`);
                setQuery("");
              }}
            >
              <Avatar name={p.full_name} size={30} />
              <span className={styles.resultInfo}>
                <span className={styles.resultName}>{p.full_name}</span>
                <span className={styles.resultMeta}>
                  {p.age}y · {genderLabel(p.gender)} · {p.phone}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const { user, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const page = TITLES.find((t) => location.pathname.startsWith(t.prefix)) ?? TITLES[0]!;
  const isAdmin = hasRole("admin");

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{page.title}</h1>
        <p className={styles.subtitle}>{page.subtitle}</p>
      </div>

      <QuickSearch />

      <div className={styles.actions}>
        <Button
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => navigate("/patients", { state: { intent: "new-prescription" } })}
        >
          New Prescription
        </Button>

        <div className={styles.profile} ref={menuRef}>
          <button
            type="button"
            className={styles.profileBtn}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <Avatar name={user?.full_name} color={user?.accent_color} size={34} />
            <span className={styles.profileText}>
              <span className={styles.profileName}>{user?.full_name}</span>
              <span className={styles.profileRole}>{user?.specialization}</span>
            </span>
            <ChevronDown size={15} className={styles.chevron} />
          </button>

          {menuOpen && (
            <div className={styles.menu} role="menu">
              <div className={styles.menuHeader}>
                <Avatar name={user?.full_name} color={user?.accent_color} size={38} />
                <div>
                  <p className={styles.menuName}>{user?.full_name}</p>
                  <Badge tone={isAdmin ? "teal" : "neutral"}>{isAdmin ? "Admin" : "Doctor"}</Badge>
                </div>
              </div>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/doctors");
                }}
              >
                <UserIcon size={15} /> View care team
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  setPasswordOpen(true);
                }}
              >
                <KeyRound size={15} /> Change password
              </button>
              <button
                type="button"
                role="menuitem"
                className={[styles.menuItem, styles.danger].join(" ")}
                onClick={() => void logout()}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </header>
  );
}
