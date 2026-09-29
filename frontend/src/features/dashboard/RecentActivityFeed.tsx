import { Activity as ActivityIcon } from "lucide-react";
import { Link } from "react-router";

import type { Activity } from "@/api/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/formatters";

import { ACTIVITY_META } from "./activityMeta";
import styles from "./RecentActivityFeed.module.css";

export function RecentActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return (
      <EmptyState
        icon={<ActivityIcon size={22} />}
        title="No activity yet"
        description="Actions across the clinic will show up here."
      />
    );
  }

  return (
    <ul className={styles.list}>
      {activities.map((a) => {
        const meta = ACTIVITY_META[a.type];
        const Icon = meta.icon;
        return (
          <li key={a.id} className={styles.row}>
            <span className={[styles.iconWrap, styles[meta.tone]].join(" ")}>
              <Icon size={14} aria-label={meta.label} />
            </span>
            <div className={styles.content}>
              <p className={styles.desc}>
                {a.patient_id ? (
                  <Link to={`/patients/${a.patient_id}`} className={styles.link}>
                    {a.description}
                  </Link>
                ) : (
                  a.description
                )}
              </p>
              <p className={styles.meta}>{timeAgo(a.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
