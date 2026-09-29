import { ChevronRight, Droplet, Users } from "lucide-react";
import { Link, useNavigate } from "react-router";

import type { Patient } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type Tone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { daysUntil, formatDate, genderLabel } from "@/lib/formatters";

import styles from "./PatientTable.module.css";

function patientStatus(patient: Patient): { label: string; tone: Tone } {
  if (!patient.last_visit_at) return { label: "New", tone: "info" };
  if (patient.next_follow_up_date && daysUntil(patient.next_follow_up_date) <= 3) {
    return { label: "Follow-up due", tone: "warning" };
  }
  return { label: "Active", tone: "success" };
}

export function PatientTable({ patients }: { patients: Patient[] }) {
  const navigate = useNavigate();

  if (!patients.length) {
    return (
      <EmptyState
        icon={<Users size={22} />}
        title="No patients match your search"
        description="Try a different name, phone number, or clear the doctor filter."
      />
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Patient</th>
            <th scope="col">Age / Gender</th>
            <th scope="col">Phone</th>
            <th scope="col">Assigned Doctor</th>
            <th scope="col">Last Visit</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="visually-hidden">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => {
            const status = patientStatus(p);
            return (
              <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)} className={styles.row}>
                <td>
                  <div className={styles.patientCell}>
                    <Avatar name={p.full_name} size={36} />
                    <div>
                      <Link
                        to={`/patients/${p.id}`}
                        className={styles.name}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.full_name}
                      </Link>
                      <div className={styles.subMeta}>
                        <Droplet size={11} /> {p.blood_group}
                        {p.allergies.length ? (
                          <span className={styles.allergy}>
                            {" "}
                            · {p.allergies.length} allerg{p.allergies.length > 1 ? "ies" : "y"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  {p.age}y · {genderLabel(p.gender)}
                </td>
                <td className={styles.muted}>{p.phone}</td>
                <td>
                  <div className={styles.doctorCell}>
                    <Avatar
                      name={p.assigned_doctor.full_name}
                      color={p.assigned_doctor.accent_color}
                      size={24}
                    />
                    <span>{p.assigned_doctor.full_name}</span>
                  </div>
                </td>
                <td className={styles.muted}>{formatDate(p.last_visit_at)}</td>
                <td>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
                <td>
                  <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
