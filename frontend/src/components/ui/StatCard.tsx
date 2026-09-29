import type { ReactNode } from "react";

import styles from "./StatCard.module.css";

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
      </div>
      {icon ? <span className={styles.iconWrap}>{icon}</span> : null}
    </div>
  );
}
