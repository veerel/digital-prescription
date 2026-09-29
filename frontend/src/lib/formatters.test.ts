import { describe, expect, it } from "vitest";

import {
  daysUntil,
  formatDate,
  formatTime,
  initials,
  parseDate,
  patientCode,
  timeAgo,
  todayInputValue,
} from "./formatters";

describe("formatters", () => {
  it("parses API calendar dates as local days, not UTC midnight", () => {
    const d = parseDate("2026-03-10");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 10]);
  });

  it("formats missing or invalid values as a dash", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
    expect(formatTime(undefined)).toBe("—");
  });

  it("counts calendar days", () => {
    const from = new Date(2026, 2, 10, 23, 59);
    expect(daysUntil("2026-03-11", from)).toBe(1);
    expect(daysUntil("2026-03-10", from)).toBe(0);
  });

  it("describes how long ago", () => {
    const now = new Date("2026-03-10T12:00:00Z");
    expect(timeAgo("2026-03-10T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-03-10T11:30:00Z", now)).toBe("30m ago");
    expect(timeAgo("2026-03-10T09:00:00Z", now)).toBe("3h ago");
    expect(timeAgo("2026-03-08T12:00:00Z", now)).toBe("2d ago");
    expect(timeAgo("2026-01-01T12:00:00Z", now)).toBe(formatDate("2026-01-01T12:00:00Z"));
  });

  it("skips the Dr. title in initials", () => {
    expect(initials("Dr. Ananya Rao")).toBe("AR");
    expect(initials("")).toBe("");
  });

  it("formats ids and input dates", () => {
    expect(patientCode(7)).toBe("PT-0007");
    expect(todayInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
