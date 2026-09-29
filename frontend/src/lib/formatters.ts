import type { Gender } from "@/api/types";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short" });

/**
 * The API sends calendar dates as "YYYY-MM-DD" (already in the clinic's
 * timezone). `new Date("2026-03-10")` would parse that as UTC midnight and
 * can show the previous day, so build a local date instead.
 */
export function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  return new Date(value);
}

function valid(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = parseDate(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = valid(value);
  return d ? dateFmt.format(d) : "—";
}

export function formatTime(value: string | Date | null | undefined): string {
  const d = valid(value);
  return d ? timeFmt.format(d) : "—";
}

export function formatWeekday(value: string | Date): string {
  const d = valid(value);
  return d ? weekdayFmt.format(d) : "";
}

export function timeAgo(value: string | Date, now: Date = new Date()): string {
  const d = valid(value);
  if (!d) return "—";
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/** Whole calendar days from `from` (default: today) until `date`. */
export function daysUntil(date: string | Date, from: Date = new Date()): number {
  const target = parseDate(date);
  const start = new Date(from);
  target.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function initials(name = ""): string {
  return name
    .split(" ")
    .filter((part) => part && part !== "Dr.")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const GENDER_LABELS: Record<Gender, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
};

export function genderLabel(gender: Gender): string {
  return GENDER_LABELS[gender];
}

/** Printed patient id, e.g. 7 -> "PT-0007". */
export function patientCode(patientNumber: number): string {
  return `PT-${String(patientNumber).padStart(4, "0")}`;
}

/** Today's date as the "YYYY-MM-DD" a date input expects. */
export function todayInputValue(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
