import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parses an ISO date string (YYYY-MM-DD) as returned by the API. */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Formats a Date as "Jul 1, 2026", matching the original prototype's display format. */
export function formatDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Formats an ISO date string straight from the API for display. */
export function formatISODate(s: string): string {
  return formatDate(parseISODate(s));
}

export function daysDiff(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

export function daysOverdue(dueDateISO: string): number {
  return Math.max(0, daysDiff(parseISODate(dueDateISO), new Date()));
}

export function daysUntilDue(dueDateISO: string): number {
  return daysDiff(new Date(), parseISODate(dueDateISO));
}
