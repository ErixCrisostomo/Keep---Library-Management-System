"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pager({
  page, total, perPage, onChange,
}: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-xs pt-2">
      <span className="font-mono text-muted-foreground">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onChange(page - 1)}
          className="p-1.5 border border-border rounded-lg hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={13} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
          return (
            <button key={p} onClick={() => onChange(p)}
              className={`w-7 h-7 text-xs border rounded-lg transition-colors ${p === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
              {p}
            </button>
          );
        })}
        <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
          className="p-1.5 border border-border rounded-lg hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
