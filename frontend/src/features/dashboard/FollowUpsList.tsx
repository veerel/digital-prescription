import { CalendarClock } from "lucide-react";
import { Link } from "react-router";

import type { FollowUp } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { daysUntil, formatDate, parseDate } from "@/lib/formatters";

import styles from "./FollowUpsList.module.css";

function whenLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/** `today` is the clinic's date from the API, so "Tomorrow" matches the clinic calendar. */
export function FollowUpsList({ followUps, today }: { followUps: FollowUp[]; today: string }) {
  if (!followUps.length) {
    return (
      <EmptyState
        icon={<CalendarClock size={22} />}
        title="No follow-ups due"
        description="Nothing scheduled in the next two weeks."
      />
    );
  }

  return (
    <ul className={styles.list}>
      {followUps.map((f) => {
        const days = daysUntil(f.follow_up_date, parseDate(today));
        return (
          <li key={f.visit_id}>
            <Link to={`/patients/${f.patient.id}`} className={styles.row}>
              <Avatar name={f.patient.full_name} size={34} />
              <div className={styles.info}>
                <span className={styles.name}>{f.patient.full_name}</span>
                <span className={styles.meta}>with {f.doctor.full_name}</span>
              </div>
              <div className={styles.when}>
                <Badge tone={days <= 3 ? "warning" : "neutral"}>{whenLabel(days)}</Badge>
                <span className={styles.date}>{formatDate(f.follow_up_date)}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
