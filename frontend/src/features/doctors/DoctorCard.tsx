import { Crown, FileText, Mail, Phone, Users } from "lucide-react";
import { Link } from "react-router";

import type { Doctor } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/formatters";

import styles from "./DoctorCard.module.css";

export function DoctorCard({
  doctor,
  onToggleActive,
  busy = false,
}: {
  doctor: Doctor;
  /** Only passed for admins, and never for their own card. */
  onToggleActive?: () => void;
  busy?: boolean;
}) {
  return (
    <article className={styles.card} aria-label={doctor.full_name}>
      <div className={styles.top}>
        <Avatar name={doctor.full_name} color={doctor.accent_color} size={52} />
        <div className={styles.identity}>
          <p className={styles.name}>{doctor.full_name}</p>
          <p className={styles.spec}>{doctor.specialization ?? "—"}</p>
        </div>
        {doctor.role === "admin" && (
          <Badge tone="teal" className={styles.adminBadge}>
            <Crown size={11} /> Admin
          </Badge>
        )}
        {!doctor.is_active && <Badge tone="danger">Disabled</Badge>}
      </div>

      {doctor.qualification && <p className={styles.qualification}>{doctor.qualification}</p>}
      {doctor.registration_number && (
        <p className={styles.regNo}>Reg. No: {doctor.registration_number}</p>
      )}

      <div className={styles.contact}>
        <span>
          <Mail size={12} /> {doctor.email}
        </span>
        {doctor.phone && (
          <span>
            <Phone size={12} /> {doctor.phone}
          </span>
        )}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <Users size={14} />
          <strong>{doctor.patient_count}</strong> patients
        </div>
        <div className={styles.stat}>
          <FileText size={14} />
          <strong>{doctor.prescription_count}</strong> prescriptions
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.joined}>Joined {formatDate(doctor.created_at)}</span>
        {onToggleActive && (
          <Button variant="ghost" size="sm" onClick={onToggleActive} disabled={busy}>
            {doctor.is_active ? "Disable" : "Enable"}
          </Button>
        )}
        <Link to={`/patients?doctor=${encodeURIComponent(doctor.id)}`} className={styles.viewLink}>
          View patients
        </Link>
      </div>
    </article>
  );
}
