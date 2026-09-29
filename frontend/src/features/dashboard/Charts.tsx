import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import styles from "./Charts.module.css";

export interface ChartPoint {
  label: string;
  count: number;
}

function TooltipCard({ active, payload, label }: TooltipContentProps) {
  const value = Number(payload[0]?.value);
  if (!active || Number.isNaN(value)) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{String(label ?? "")}</p>
      <p className={styles.tooltipValue}>
        {value} visit{value === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function VisitsChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e2e8ed" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#5b6b73" }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#5b6b73" }}
          width={28}
        />
        <Tooltip
          content={(props) => <TooltipCard {...props} />}
          cursor={{ stroke: "#14b8a6", strokeWidth: 1, strokeDasharray: "4 4" }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#0d9488"
          strokeWidth={2.5}
          fill="url(#visitsFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#7fe3d4", "#b8efe4"];

export function TopDiagnosesChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) return <p className={styles.barLabel}>No visits recorded yet.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className={styles.barList} aria-label="Top diagnoses">
      {data.map((d, i) => (
        <li key={d.label} className={styles.barRow}>
          <span className={styles.barLabel}>{d.label}</span>
          <div className={styles.barTrack} aria-hidden="true">
            <div
              className={styles.barFill}
              style={{ width: `${(d.count / max) * 100}%`, background: COLORS[i % COLORS.length] }}
            />
          </div>
          <span className={styles.barValue}>{d.count}</span>
        </li>
      ))}
    </ul>
  );
}
