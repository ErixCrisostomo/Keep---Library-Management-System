"use client";

import { Bell, X, BookMarked, RefreshCw, AlertTriangle, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { AuthUser, Loan } from "@/lib/types";
import { daysOverdue, daysUntilDue, formatISODate } from "@/lib/utils";

interface NotifPanelProps {
  user: AuthUser;
  loans: Loan[];
  onClose: () => void;
  onNavigate: (mode: string) => void;
}

export function NotificationPanel({ user, loans, onClose, onNavigate }: NotifPanelProps) {
  const pendingBorrows = loans.filter((l) => l.status === "Requested");
  const pendingReturns = loans.filter((l) => l.status === "Return Requested");
  const overdueLoans = loans.filter((l) => l.status === "Overdue");

  const myOverdue = loans.filter((l) => l.student_login_id === user.login_id && l.status === "Overdue");
  const myUpcoming = loans.filter((l) => {
    const d = daysUntilDue(l.due_date);
    return l.student_login_id === user.login_id && l.status === "Active" && d >= 0 && d <= 3;
  });

  const adminTotal = pendingBorrows.length + pendingReturns.length + overdueLoans.length;
  const studentTotal = myOverdue.length + myUpcoming.length;
  const isEmpty = user.role === "librarian" ? adminTotal === 0 : studentTotal === 0;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-40 overflow-hidden" style={{ maxHeight: "480px", overflowY: "auto" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
          <span className="text-sm font-semibold">Notifications</span>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"><X size={13} /></button>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
            <Bell size={20} className="opacity-30" />
            No notifications right now.
          </div>
        ) : user.role === "librarian" ? (
          <div className="flex flex-col divide-y divide-border">
            {pendingBorrows.map((loan) => (
              <button key={`br-${loan.id}`} onClick={() => { onNavigate("requests"); onClose(); }}
                className="flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group w-full">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <BookMarked size={13} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground leading-snug">New Borrow Request</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    <span className="font-medium">{loan.student_name}</span> requested &quot;{loan.book_title}&quot;
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">{formatISODate(loan.borrow_date)}</div>
                </div>
                <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </button>
            ))}
            {pendingReturns.map((loan) => (
              <button key={`rr-${loan.id}`} onClick={() => { onNavigate("requests"); onClose(); }}
                className="flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group w-full">
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                  <RefreshCw size={13} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground leading-snug">Return Request</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    <span className="font-medium">{loan.student_name}</span> is returning &quot;{loan.book_title}&quot;
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">{loan.student_login_id}</div>
                </div>
                <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </button>
            ))}
            {overdueLoans.map((loan) => (
              <button key={`ov-${loan.id}`} onClick={() => { onNavigate("overdue"); onClose(); }}
                className="flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group w-full">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={13} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-red-700 leading-snug">Overdue Item</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    <span className="font-medium">{loan.student_name}</span> — &quot;{loan.book_title}&quot;
                  </div>
                  <div className="text-[10px] font-mono text-red-500 mt-1">+{daysOverdue(loan.due_date)} days past due</div>
                </div>
                <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {myOverdue.map((loan) => (
              <div key={`ov-${loan.id}`} className="flex items-start gap-3 px-4 py-3 bg-red-50/60">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle size={13} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-red-700 leading-snug">Book Overdue</div>
                  <div className="text-xs text-muted-foreground mt-0.5">&quot;{loan.book_title}&quot; was due on <span className="font-mono">{formatISODate(loan.due_date)}</span>.</div>
                  <div className="text-[10px] font-mono text-red-500 mt-1">+{daysOverdue(loan.due_date)} days — return immediately</div>
                </div>
              </div>
            ))}
            {myUpcoming.map((loan) => (
              <div key={`up-${loan.id}`} className="flex items-start gap-3 px-4 py-3 bg-amber-50/60">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={13} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-amber-800 leading-snug">Due Soon</div>
                  <div className="text-xs text-muted-foreground mt-0.5">&quot;{loan.book_title}&quot; is due on <span className="font-mono">{formatISODate(loan.due_date)}</span>.</div>
                  <div className="text-[10px] font-mono text-amber-600 mt-1">
                    {daysUntilDue(loan.due_date) === 0 ? "Due today" : `${daysUntilDue(loan.due_date)} day${daysUntilDue(loan.due_date) > 1 ? "s" : ""} remaining`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
