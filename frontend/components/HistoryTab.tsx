"use client";

import { useState } from "react";
import { History, BookMarked, ThumbsUp, ThumbsDown, RefreshCw, CheckCircle2, ArrowLeftRight } from "lucide-react";
import { TxLog, TxType } from "@/lib/types";
import { PER_PAGE } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Pager } from "@/components/Pager";

export const TX_COLORS: Record<TxType, { bg: string; border: string; icon: React.ElementType; iconColor: string; label: string }> = {
  request_borrow: { bg: "bg-blue-50", border: "border-blue-200", icon: BookMarked, iconColor: "text-blue-600", label: "Borrow Requested" },
  approve_borrow: { bg: "bg-emerald-50", border: "border-emerald-200", icon: ThumbsUp, iconColor: "text-emerald-600", label: "Borrow Approved" },
  reject_borrow: { bg: "bg-red-50", border: "border-red-200", icon: ThumbsDown, iconColor: "text-red-600", label: "Borrow Rejected" },
  request_return: { bg: "bg-violet-50", border: "border-violet-200", icon: RefreshCw, iconColor: "text-violet-600", label: "Return Requested" },
  reject_return: { bg: "bg-red-50", border: "border-red-200", icon: ThumbsDown, iconColor: "text-red-600", label: "Return Rejected" },
  approve_return: { bg: "bg-teal-50", border: "border-teal-200", icon: CheckCircle2, iconColor: "text-teal-600", label: "Return Confirmed" },
  direct_checkout: { bg: "bg-amber-50", border: "border-amber-200", icon: ArrowLeftRight, iconColor: "text-amber-700", label: "Direct Checkout" },
  direct_return: { bg: "bg-stone-50", border: "border-stone-300", icon: CheckCircle2, iconColor: "text-stone-600", label: "Direct Return" },
};

export function HistoryTab({ logs, showStudentInfo = true }: { logs: TxLog[]; showStudentInfo?: boolean }) {
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [filters, setFilters] = useState({ borrow: true, request: true, approved: true, rejected: true, direct: true, returns: true });
  const [q, setQ] = useState("");

  const CATEGORY_MAP: Record<string, TxType[]> = {
    borrow: ["request_borrow", "approve_borrow", "reject_borrow"],
    request: ["request_borrow", "request_return"],
    approved: ["approve_borrow", "approve_return"],
    rejected: ["reject_borrow", "reject_return"],
    direct: ["direct_checkout", "direct_return"],
    returns: ["request_return", "approve_return", "reject_return", "direct_return"],
  };

  // Apply filters: support combining scopes (borrow/returns/direct) with statuses (approved/rejected/request)
  const selectedKeys = Object.entries(filters).filter(([, v]) => v).map(([k]) => k);
  const scopeKeys = ["borrow", "returns", "direct"];
  const statusKeys = ["approved", "rejected", "request"];
  const selectedScopes = selectedKeys.filter((k) => scopeKeys.includes(k));
  const selectedStatuses = selectedKeys.filter((k) => statusKeys.includes(k));

  let activeTypes: TxType[] = [];
  if (selectedScopes.length > 0 && selectedStatuses.length > 0) {
    const typesInScopes = Array.from(new Set(selectedScopes.flatMap((k) => CATEGORY_MAP[k] ?? [])));
    const typesInStatuses = Array.from(new Set(selectedStatuses.flatMap((k) => CATEGORY_MAP[k] ?? [])));
    // types that are both in any selected scope and any selected status
    activeTypes = typesInScopes.filter((t) => typesInStatuses.includes(t));
  } else if (selectedScopes.length > 0) {
    activeTypes = Array.from(new Set(selectedScopes.flatMap((k) => CATEGORY_MAP[k] ?? [])));
  } else if (selectedStatuses.length > 0) {
    activeTypes = Array.from(new Set(selectedStatuses.flatMap((k) => CATEGORY_MAP[k] ?? [])));
  } else {
    activeTypes = [];
  }

  const filteredByType = activeTypes.length > 0 ? logs.filter((l) => activeTypes.includes(l.type)) : [];

  // Apply search query across multiple fields
  const qNorm = q.trim().toLowerCase();
  const matchesQuery = (l: TxLog) => {
    if (!qNorm) return true;
    // date/time match
    const created = String(l.created_at).toLowerCase();
    if (created.includes(qNorm)) return true;
    if ((l.book_title || "").toLowerCase().includes(qNorm)) return true;
    if ((l.author || "").toLowerCase().includes(qNorm)) return true;
    if ((l.actor_name || "").toLowerCase().includes(qNorm)) return true;
    if ((l.student_name || "").toLowerCase().includes(qNorm)) return true;
    if ((l.student_login_id || "").toLowerCase().includes(qNorm)) return true;
    if ((l.loan_id || "").toLowerCase().includes(qNorm)) return true;
    const label = (TX_COLORS[l.type]?.label || l.type).toLowerCase();
    if (label.includes(qNorm)) return true;
    return false;
  };

  const filtered = filteredByType.filter(matchesQuery);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return sortOrder === "latest" ? tb - ta : ta - tb;
  });

  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2"><History size={16} className="text-primary" />Transaction Log</h2>
        <span className="text-xs font-mono text-muted-foreground">{logs.length} transaction{logs.length !== 1 ? "s" : ""}</span>
      </div>
      {/* Controls: filters + sort */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-2 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search date, time, title, author, type..."
                className="w-full md:w-72 px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground"
              />
              <span className="text-xs text-muted-foreground mr-1">Show:</span>
          <label className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-md border ${filters.borrow ? "border-amber-200 bg-amber-50" : "border-border bg-transparent"}`}>
            <input
              type="checkbox"
              checked={filters.borrow}
              onChange={(e) => {
                setFilters((s) => ({ ...s, borrow: e.target.checked }));
                setPage(1);
              }}
              className="w-4 h-4 rounded border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <span className="select-none">Borrow</span>
          </label>
          <label className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-md border ${filters.request ? "border-amber-200 bg-amber-50" : "border-border bg-transparent"}`}>
            <input
              type="checkbox"
              checked={filters.request}
              onChange={(e) => {
                setFilters((s) => ({ ...s, request: e.target.checked }));
                setPage(1);
              }}
              className="w-4 h-4 rounded border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <span className="select-none">Request</span>
          </label>
          <label className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-md border ${filters.approved ? "border-amber-200 bg-amber-50" : "border-border bg-transparent"}`}>
            <input
              type="checkbox"
              checked={filters.approved}
              onChange={(e) => {
                setFilters((s) => ({ ...s, approved: e.target.checked }));
                setPage(1);
              }}
              className="w-4 h-4 rounded border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <span className="select-none">Approved</span>
          </label>
          <label className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-md border ${filters.rejected ? "border-amber-200 bg-amber-50" : "border-border bg-transparent"}`}>
            <input
              type="checkbox"
              checked={filters.rejected}
              onChange={(e) => {
                setFilters((s) => ({ ...s, rejected: e.target.checked }));
                setPage(1);
              }}
              className="w-4 h-4 rounded border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <span className="select-none">Rejected</span>
          </label>
          <label className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-md border ${filters.direct ? "border-amber-200 bg-amber-50" : "border-border bg-transparent"}`}>
            <input
              type="checkbox"
              checked={filters.direct}
              onChange={(e) => {
                setFilters((s) => ({ ...s, direct: e.target.checked }));
                setPage(1);
              }}
              className="w-4 h-4 rounded border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <span className="select-none">Direct</span>
          </label>
          <label className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-md border ${filters.returns ? "border-amber-200 bg-amber-50" : "border-border bg-transparent"}`}>
            <input
              type="checkbox"
              checked={filters.returns}
              onChange={(e) => {
                setFilters((s) => ({ ...s, returns: e.target.checked }));
                setPage(1);
              }}
              className="w-4 h-4 rounded border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <span className="select-none">Returns</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Sort:</label>
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as "latest" | "oldest");
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No transactions recorded yet.</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No transactions match your filters.</div>
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
