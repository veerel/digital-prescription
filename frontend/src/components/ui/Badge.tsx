import type { ReactNode } from "react";

import styles from "./Badge.module.css";

export type Tone = "neutral" | "teal" | "success" | "warning" | "danger" | "info" | "navy";

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={[styles.badge, styles[tone], className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
