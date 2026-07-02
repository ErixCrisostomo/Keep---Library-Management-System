import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Book, SortOption } from "./types";

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

/** Formats a full ISO datetime string (with time) from the API, e.g. "Jul 1, 2026 · 14:32". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${formatDate(d)} · ${h}:${m}`;
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

export function sortBooks(books: Book[], sort: SortOption): Book[] {
  let result = [...books];
  if (sort === "available-only") result = result.filter((b) => b.available > 0);
  else if (sort === "out-of-stock") result = result.filter((b) => b.available === 0);
  if (sort === "za") return result.sort((a, b) => b.title.localeCompare(a.title));
  if (sort === "avail-desc") return result.sort((a, b) => b.available - a.available);
  if (sort === "avail-asc") return result.sort((a, b) => a.available - b.available);
  return result.sort((a, b) => a.title.localeCompare(b.title));
}
