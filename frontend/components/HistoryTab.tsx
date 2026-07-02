"use client";

import { useState } from "react";
import { History, BookMarked, ThumbsUp, ThumbsDown, RefreshCw, CheckCircle2, ArrowLeftRight } from "lucide-react";
import { TxLog, TxType } from "@/lib/types";
import { PER_PAGE } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Pager } from "@/components/Pager";

const TX_COLORS: Record<TxType, { bg: string; border: string; icon: React.ElementType; iconColor: string; label: string }> = {
  request_borrow: { bg: "bg-blue-50", border: "border-blue-200", icon: BookMarked, iconColor: "text-blue-600", label: "Borrow Requested" },
  approve_borrow: { bg: "bg-emerald-50", border: "border-emerald-200", icon: ThumbsUp, iconColor: "text-emerald-600", label: "Borrow Approved" },
  reject_borrow: { bg: "bg-red-50", border: "border-red-200", icon: ThumbsDown, iconColor: "text-red-600", label: "Borrow Rejected" },
  request_return: { bg: "bg-violet-50", border: "border-violet-200", icon: RefreshCw, iconColor: "text-violet-600", label: "Return Requested" },
  approve_return: { bg: "bg-teal-50", border: "border-teal-200", icon: CheckCircle2, iconColor: "text-teal-600", label: "Return Confirmed" },
  direct_checkout: { bg: "bg-amber-50", border: "border-amber-200", icon: ArrowLeftRight, iconColor: "text-amber-700", label: "Direct Checkout" },
  direct_return: { bg: "bg-stone-50", border: "border-stone-300", icon: CheckCircle2, iconColor: "text-stone-600", label: "Direct Return" },
};

export function HistoryTab({ logs, showStudentInfo = true }: { logs: TxLog[]; showStudentInfo?: boolean }) {
  const [page, setPage] = useState(1);
  const sorted = [...logs].reverse();
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2"><History size={16} className="text-primary" />Transaction Log</h2>
        <span className="text-xs font-mono text-muted-foreground">{logs.length} transaction{logs.length !== 1 ? "s" : ""}</span>
      </div>
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No transactions recorded yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {paged.map((log) => {
            const cfg = TX_COLORS[log.type];
            const Icon = cfg.icon;
            return (
              <div key={log.id} className={`flex flex-col gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full bg-white/70 flex items-center justify-center shrink-0 mt-0.5 border ${cfg.border}`}>
                    <Icon size={14} className={cfg.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0 grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{cfg.label}</div>
                      <div className="text-sm text-foreground mt-1 truncate">
                        <span className="font-medium">&quot;{log.book_title}&quot;</span>
                        <span className="text-muted-foreground"> by {log.author}</span>
                      </div>
                      {showStudentInfo && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          Student: <span className="font-medium">{log.student_name}</span> · <span className="font-mono">{log.student_login_id}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-1 text-left md:items-end md:text-right">
                      {log.loan_id && <span className="text-[10px] font-mono text-muted-foreground bg-white/60 px-1.5 py-0.5 rounded">{log.loan_id}</span>}
                      <span className="text-[10px] font-mono text-muted-foreground">{formatDateTime(log.created_at)}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">by {log.actor_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <Pager page={page} total={sorted.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
