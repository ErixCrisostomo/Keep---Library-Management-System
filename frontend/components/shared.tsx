"use client";

import { CheckCircle2 } from "lucide-react";
import { LoanStatus } from "@/lib/types";

const GENRE_CLASSES: Record<string, string> = {
  Fiction: "bg-amber-200 text-amber-950 border-amber-500",
  Dystopian: "bg-stone-200 text-stone-950 border-stone-600",
  Poetry: "bg-rose-200 text-rose-950 border-rose-500",
  Science: "bg-emerald-200 text-emerald-950 border-emerald-600",
  History: "bg-yellow-200 text-yellow-950 border-yellow-600",
  Technology: "bg-orange-200 text-orange-950 border-orange-600",
  Philosophy: "bg-emerald-200 text-emerald-950 border-emerald-600",
  Economics: "bg-red-200 text-red-950 border-red-600",
  Psychology: "bg-orange-200 text-orange-950 border-orange-600",
};

export function StatusBadge({ status }: { status: LoanStatus }) {
  const cfg: Record<LoanStatus, string> = {
    Requested: "bg-blue-50 text-blue-700 border border-blue-200",
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Overdue: "bg-red-50 text-red-700 border border-red-200",
    "Return Requested": "bg-violet-50 text-violet-700 border border-violet-200",
    Returned: "bg-stone-100 text-stone-500 border border-stone-200",
  };
  const dot: Record<LoanStatus, React.ReactNode> = {
    Requested: <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />,
    Active: <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />,
    Overdue: <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />,
    "Return Requested": <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />,
    Returned: <CheckCircle2 size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium ${cfg[status]}`}>
      {dot[status]}{status}
    </span>
  );
}

export function AvailabilityBar({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? (available / total) * 100 : 0;
  const color = pct === 0 ? "bg-red-400" : pct < 40 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="inline-flex items-center gap-2 font-serif text-xs text-muted-foreground leading-none">
      <div className="w-20 min-w-[5rem] h-2 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="leading-none">{available}/{total}</span>
    </div>
  );
}

export function GenreChip({ genre, small }: { genre: string; small?: boolean }) {
  const cls = GENRE_CLASSES[genre] ?? "bg-amber-200 text-amber-950 border-amber-600";
  return (
    <span className={`inline-flex items-center border rounded-full px-2.5 py-0.5 font-medium ${small ? "text-[10px]" : "text-xs"} ${cls}`}>
      {genre}
    </span>
  );
}

export function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-primary text-primary-foreground text-sm rounded-xl shadow-lg flex items-center gap-2">
      <CheckCircle2 size={14} /> {msg}
    </div>
  );
}
