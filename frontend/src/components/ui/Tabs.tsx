import type { ReactNode } from "react";

import styles from "./Tabs.module.css";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

export function Tabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: TabItem<T>[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.tabs} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={active === item.value}
          className={[styles.tab, active === item.value ? styles.active : ""].join(" ")}
          onClick={() => onChange(item.value)}
        >
          {item.icon}
          {item.label}
          {typeof item.count === "number" ? (
            <span className={styles.count}>{item.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
