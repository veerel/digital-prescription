import { History, Printer } from "lucide-react";
import { Link } from "react-router";

import type { Visit } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/formatters";

import styles from "./PatientHistoryTimeline.module.css";

export function PatientHistoryTimeline({ visits }: { visits: Visit[] }) {
  if (!visits.length) {
    return (
      <EmptyState
        icon={<History size={22} />}
        title="No visit history yet"
        description="Prescriptions created for this patient will appear here, newest first."
      />
    );
  }

  return (
    <ol className={styles.timeline} aria-label="Visit history">
      {visits.map((v, i) => (
        <li className={styles.item} key={v.id}>
          <div className={styles.rail} aria-hidden="true">
            <span className={styles.dot} />
            {i < visits.length - 1 && <span className={styles.line} />}
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.doctorInfo}>
                <Avatar name={v.doctor.full_name} color={v.doctor.accent_color} size={32} />
                <div>
                  <p className={styles.doctorName}>{v.doctor.full_name}</p>
                  <p className={styles.date}>{formatDate(v.visited_at)}</p>
                </div>
              </div>
              <Link to={`/prescriptions/${v.id}/print`} className={styles.printLink}>
                <Printer size={14} /> View / Print
              </Link>
            </div>

            <p className={styles.diagnosis}>{v.diagnosis}</p>
            {v.complaints && <p className={styles.complaints}>“{v.complaints}”</p>}

            {v.medicines.length > 0 && (
              <div className={styles.medChips}>
                {v.medicines.map((m, idx) => (
                  <span key={idx} className={styles.medChip}>
                    {m.name} <span className={styles.medDosage}>{m.dosage}</span>
                  </span>
                ))}
              </div>
            )}

            <div className={styles.footerRow}>
              {v.follow_up_date && (
                <Badge tone="neutral">Follow-up: {formatDate(v.follow_up_date)}</Badge>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
