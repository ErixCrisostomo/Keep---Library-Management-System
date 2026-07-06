"use client";

import { useState, useEffect, type ElementType } from "react";
import { Search, Users, User, BookMarked, AlertCircle, History, Clock, ThumbsUp, ThumbsDown, RefreshCw, CheckCircle2, ArrowLeftRight } from "lucide-react";
import { Loan, StudentProfile, TxLog, TxType } from "@/lib/types";
import { PER_PAGE } from "@/lib/constants";
import { daysOverdue, formatISODate, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/shared";
import { Pager } from "@/components/Pager";

const TX_LABELS: Record<TxType, string> = {
  request_borrow: "Borrow Requested",
  approve_borrow: "Borrow Approved",
  reject_borrow: "Borrow Rejected",
  request_return: "Return Requested",
  approve_return: "Return Confirmed",
  direct_checkout: "Direct Checkout",
  direct_return: "Direct Return",
  reject_return: "Return Rejected",
};

const TX_COLORS: Record<TxType, { bg: string; border: string; icon: ElementType; iconColor: string }> = {
  request_borrow: { bg: "bg-blue-50", border: "border-blue-200", icon: BookMarked, iconColor: "text-blue-600" },
  approve_borrow: { bg: "bg-emerald-50", border: "border-emerald-200", icon: ThumbsUp, iconColor: "text-emerald-600" },
  reject_borrow: { bg: "bg-red-50", border: "border-red-200", icon: ThumbsDown, iconColor: "text-red-600" },
  request_return: { bg: "bg-violet-50", border: "border-violet-200", icon: RefreshCw, iconColor: "text-violet-600" },
  approve_return: { bg: "bg-teal-50", border: "border-teal-200", icon: CheckCircle2, iconColor: "text-teal-600" },
  reject_return: { bg: "bg-red-50", border: "border-red-200", icon: ThumbsDown, iconColor: "text-red-600" },
  direct_checkout: { bg: "bg-amber-50", border: "border-amber-200", icon: ArrowLeftRight, iconColor: "text-amber-700" },
  direct_return: { bg: "bg-stone-50", border: "border-stone-300", icon: CheckCircle2, iconColor: "text-stone-600" },
};

export function StudentsTab({ students, loans, logs }: { students: StudentProfile[]; loans: Loan[]; logs: TxLog[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudentProfile | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [activeLoanPage, setActiveLoanPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.login_id.includes(q)
      || (s.section ?? "").toLowerCase().includes(q) || (s.course ?? "").toLowerCase().includes(q);
  });

  const getStudentLoans = (loginId: string) => loans.filter((l) => l.student_login_id === loginId);
  const getStudentLogs = (loginId: string) => [...logs.filter((l) => l.student_login_id === loginId)].reverse();

  const activeFor = (loginId: string) => getStudentLoans(loginId).filter((l) => l.status === "Active" || l.status === "Overdue");
  const requestsFor = (loginId: string) => getStudentLoans(loginId).filter((l) => l.status === "Requested" || l.status === "Return Requested");
  const selectedLogs = selected ? getStudentLogs(selected.login_id) : [];
  const selectedActiveLoans = selected ? activeFor(selected.login_id) : [];
  const selectedRequests = selected ? requestsFor(selected.login_id) : [];

  const historyTotalPages = Math.max(1, Math.ceil(selectedLogs.length / PER_PAGE));
  const currentHistoryPage = Math.min(historyPage, historyTotalPages);
  const pagedSelectedLogs = selectedLogs.slice((currentHistoryPage - 1) * PER_PAGE, currentHistoryPage * PER_PAGE);

  const activeLoanTotalPages = Math.max(1, Math.ceil(selectedActiveLoans.length / PER_PAGE));
  const currentActiveLoanPage = Math.min(activeLoanPage, activeLoanTotalPages);
  const pagedSelectedActiveLoans = selectedActiveLoans.slice((currentActiveLoanPage - 1) * PER_PAGE, currentActiveLoanPage * PER_PAGE);

  const requestTotalPages = Math.max(1, Math.ceil(selectedRequests.length / PER_PAGE));
  const currentRequestPage = Math.min(requestPage, requestTotalPages);
  const pagedSelectedRequests = selectedRequests.slice((currentRequestPage - 1) * PER_PAGE, currentRequestPage * PER_PAGE);

  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages);
  }, [historyPage, historyTotalPages]);

  useEffect(() => {
    if (activeLoanPage > activeLoanTotalPages) setActiveLoanPage(activeLoanTotalPages);
  }, [activeLoanPage, activeLoanTotalPages]);

  useEffect(() => {
    if (requestPage > requestTotalPages) setRequestPage(requestTotalPages);
  }, [requestPage, requestTotalPages]);

  return (
    <div className="flex gap-5" style={{ minHeight: 500 }}>
      {/* Student list */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full pl-8 pr-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="text-xs font-mono text-muted-foreground">{filtered.length} registered student{filtered.length !== 1 ? "s" : ""}</div>
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1" style={{ maxHeight: 520 }}>
          {filtered.map((s) => {
            const overdueCount = getStudentLoans(s.login_id).filter((l) => l.status === "Overdue").length;
            const activeCount = activeFor(s.login_id).length;
            const reqCount = requestsFor(s.login_id).length;
            const isSelected = selected?.id === s.id;
            return (
              <button key={s.id} onClick={() => { setSelected(s); setHistoryPage(1); setActiveLoanPage(1); setRequestPage(1); }}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted/50"}`}>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold truncate leading-snug ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{s.name}</div>
                    <div className={`text-xs font-mono mt-0.5 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{s.login_id}</div>
                    {s.section && <div className={`text-xs mt-0.5 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{s.section}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {overdueCount > 0 && <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-red-500 text-white rounded-full">{overdueCount} overdue</span>}
                    {activeCount > 0 && !overdueCount && <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{activeCount} active</span>}
                    {reqCount > 0 && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">{reqCount} req</span>}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No students found.</div>}
        </div>
      </div>

      <div className="w-px bg-border shrink-0" />

      {/* Detail panel */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-16">
            <Users size={32} className="opacity-20" />
            <span className="text-sm">Select a student to view their profile</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold font-serif">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{selected.course ?? "—"} {selected.year_level ? `· ${selected.year_level}` : ""}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                {[
                  { label: "Student Number", value: selected.login_id, mono: true },
                  { label: "Section", value: selected.section ?? "—", mono: false },
                  { label: "Email", value: selected.email ?? "—", mono: true },
                  { label: "Course", value: selected.course ?? "—", mono: false },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
                    <div className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <BookMarked size={14} className="text-primary" />
                Active Loans ({activeFor(selected.login_id).length})
              </h3>
              {selectedActiveLoans.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 border border-dashed border-border rounded-xl text-center">No active loans.</div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {pagedSelectedActiveLoans.map((loan) => (
                      <div key={loan.id} className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 ${loan.status === "Overdue" ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{loan.book_title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{loan.author}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock size={11} className="text-muted-foreground" />
                            <span className={`text-[10px] font-mono ${loan.status === "Overdue" ? "text-red-700 font-semibold" : "text-muted-foreground"}`}>Due {formatISODate(loan.due_date)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={loan.status} />
                          {loan.status === "Overdue" && <span className="text-[10px] font-mono text-red-600">+{daysOverdue(loan.due_date)} days</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pager page={currentActiveLoanPage} total={selectedActiveLoans.length} perPage={PER_PAGE} onChange={setActiveLoanPage} />
                </>
              )}
            </div>

            {selectedRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle size={14} className="text-blue-600" />
                  Pending Requests ({selectedRequests.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {pagedSelectedRequests.map((loan) => (
                    <div key={loan.id} className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${loan.status === "Return Requested" ? "bg-violet-50 border-violet-200" : "bg-blue-50 border-blue-200"}`}>
                      <div>
                        <div className="text-sm font-medium">{loan.book_title}</div>
                        <div className="text-xs text-muted-foreground">{loan.author}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{formatISODate(loan.borrow_date)}</div>
                      </div>
                      <StatusBadge status={loan.status} />
                    </div>
                  ))}
                </div>
                <Pager page={currentRequestPage} total={selectedRequests.length} perPage={PER_PAGE} onChange={setRequestPage} />
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <History size={14} className="text-primary" />
                Transaction History ({selectedLogs.length})
              </h3>
              {selectedLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 border border-dashed border-border rounded-xl text-center">No transactions on record.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pagedSelectedLogs.map((log) => {
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
                              <div className="text-sm font-semibold truncate">{TX_LABELS[log.type]}</div>
                              <div className="text-sm text-foreground mt-1 truncate">
                                <span className="font-medium">&quot;{log.book_title}&quot;</span>
                                <span className="text-muted-foreground"> by {log.author}</span>
                              </div>
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
                  <Pager page={currentHistoryPage} total={selectedLogs.length} perPage={PER_PAGE} onChange={setHistoryPage} />
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
