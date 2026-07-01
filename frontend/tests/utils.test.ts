import { describe, it, expect } from "vitest";
import { daysOverdue, daysUntilDue, formatISODate, cn } from "@/lib/utils";

describe("date utils", () => {
  it("computes daysOverdue as 0 for a future due date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const iso = future.toISOString().slice(0, 10);
    expect(daysOverdue(iso)).toBe(0);
  });

  it("computes daysOverdue > 0 for a past due date", () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    const iso = past.toISOString().slice(0, 10);
    expect(daysOverdue(iso)).toBeGreaterThanOrEqual(2);
  });

  it("computes daysUntilDue for a future date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 4);
    const iso = future.toISOString().slice(0, 10);
    expect(daysUntilDue(iso)).toBeGreaterThanOrEqual(3);
  });

  it("formats an ISO date string for display", () => {
    expect(formatISODate("2026-07-01")).toBe("Jul 1, 2026");
  });
});

describe("cn (classname merge)", () => {
  it("merges and dedupes tailwind classes", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
