import { CalendarSearch, ChevronRight, Printer } from "lucide-react";
import { useNavigate } from "react-router";

import type { Visit } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatTime } from "@/lib/formatters";

import styles from "./VisitLogTable.module.css";

export function VisitLogTable({ visits }: { visits: Visit[] }) {
  const navigate = useNavigate();

  if (!visits.length) {
    return (
      <EmptyState
        icon={<CalendarSearch size={22} />}
        title="No visits in this range"
        description="Try widening the date range, or clearing the patient / doctor filters."
      />
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Patient</th>
            <th scope="col">Visited On</th>
            <th scope="col">Doctor Met</th>
            <th scope="col">Reason / Diagnosis</th>
            <th scope="col">Follow-up</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visits.map((v) => (
            <tr
              key={v.id}
              className={styles.row}
              onClick={() => navigate(`/patients/${v.patient.id}`)}
            >
              <td>
                <div className={styles.patientCell}>
                  <Avatar name={v.patient.full_name} size={34} />
                  <div>
                    <div className={styles.name}>{v.patient.full_name}</div>
                    <div className={styles.subMeta}>{v.patient.phone}</div>
                  </div>
                </div>
              </td>
              <td>
                <div className={styles.dateCell}>
                  <span className={styles.date}>{formatDate(v.visited_at)}</span>
                  <span className={styles.time}>{formatTime(v.visited_at)}</span>
                </div>
              </td>
              <td>
                <div className={styles.doctorCell}>
                  <Avatar name={v.doctor.full_name} color={v.doctor.accent_color} size={26} />
                  <div>
                    <div className={styles.doctorName}>{v.doctor.full_name}</div>
                    <div className={styles.subMeta}>{v.doctor.specialization}</div>
                  </div>
                </div>
              </td>
              <td className={styles.diagnosisCell}>{v.diagnosis}</td>
              <td>
                {v.follow_up_date ? (
                  <Badge tone="neutral">{formatDate(v.follow_up_date)}</Badge>
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </td>
              <td>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.printBtn}
                    title="View / print this prescription"
                    aria-label={`Print prescription for ${v.patient.full_name}, ${formatDate(v.visited_at)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/prescriptions/${v.id}/print`);
                    }}
                  >
                    <Printer size={14} />
                  </button>
                  <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
