import { initials } from "@/lib/formatters";

import styles from "./Avatar.module.css";

const PALETTE = ["#14b8a6", "#3568c9", "#b9791a", "#8b5cf6", "#dc4c8c", "#2f9e6e", "#0b3d4c"];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % PALETTE.length;
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? "#14b8a6";
}

// Only a strict #rrggbb reaches a style (the API validates this too).
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function Avatar({
  name = "",
  size = 36,
  color,
  className = "",
}: {
  name?: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const background = color && HEX_COLOR.test(color) ? color : colorFor(name);
  return (
    <span
      className={[styles.avatar, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, fontSize: size * 0.38, background }}
      title={name}
      aria-hidden="true"
    >
      {initials(name) || "?"}
    </span>
  );
}
