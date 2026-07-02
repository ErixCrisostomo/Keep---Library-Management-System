"use client";

import { useEffect, useState, type ElementType } from "react";
import { AlertCircle, Clock, RefreshCw, BookOpen, BookMarked, Library as LibraryIcon, History as HistoryIcon } from "lucide-react";
import { AuthUser, Book, Loan, TxLog } from "@/lib/types";
import { PER_PAGE } from "@/lib/constants";
import { daysOverdue, daysUntilDue, formatISODate } from "@/lib/utils";
import { StatusBadge, Toast } from "@/components/shared";
import { ReturnConfirmModal } from "@/components/ConfirmModals";
import { LibraryTab } from "@/components/LibraryTab";
import { HistoryTab } from "@/components/HistoryTab";
import { Pager } from "@/components/Pager";

type StudentTab = "library" | "loans" | "history";

interface StudentDashboardProps {
  user: AuthUser;
  books: Book[];
  loans: Loan[];
  logs: TxLog[];
  onBorrow: (bookId: string) => Promise<string | null>;
  onRequestReturn: (loanId: string) => Promise<void>;
}

export function StudentDashboard({ user, books, loans, logs, onBorrow, onRequestReturn }: StudentDashboardProps) {
  const [tab, setTab] = useState<StudentTab>("library");
  const [returnModal, setReturnModal] = useState<Loan | null>(null);
  const [toast, setToast] = useState("");
  const [loanPage, setLoanPage] = useState(1);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const myLoans = loans.filter((l) => l.student_login_id === user.login_id);
  const statusOrder: Record<string, number> = { Requested: 3, Active: 2, "Return Requested": 1 };
  const myActiveLoans = myLoans.filter((l) => l.status !== "Returned").sort((a, b) => {
    if (a.status === "Overdue") return -1;
    if (b.status === "Overdue") return 1;
    return (statusOrder[b.status] ?? 0) - (statusOrder[a.status] ?? 0);
  });
  const myOverdue = myActiveLoans.filter((l) => l.status === "Overdue");
  const myUpcoming = myActiveLoans.filter((l) => {
    const d = daysUntilDue(l.due_date);
    return l.status === "Active" && d >= 0 && d <= 3;
  });

  const studentLogs = logs.filter((log) => log.student_login_id === user.login_id);
  const loanTotalPages = Math.max(1, Math.ceil(myActiveLoans.length / PER_PAGE));
  const currentLoanPage = Math.min(loanPage, loanTotalPages);
  const pagedActiveLoans = myActiveLoans.slice((currentLoanPage - 1) * PER_PAGE, currentLoanPage * PER_PAGE);

  useEffect(() => {
    if (loanPage > loanTotalPages) setLoanPage(loanTotalPages);
  }, [loanPage, loanTotalPages]);

  const handleConfirmReturn = async () => {
    if (!returnModal) return;
    await onRequestReturn(returnModal.id);
    showToast(`Return request sent for "${returnModal.book_title}".`);
    setReturnModal(null);
  };

  const studentTabs: Array<{ id: StudentTab; label: string; icon: ElementType }> = [
    { id: "library", label: "Library", icon: LibraryIcon },
    { id: "loans", label: `Active Loans (${myActiveLoans.length})`, icon: BookMarked },
    { id: "history", label: "History", icon: HistoryIcon },
  ];

  return (
    <>
      {returnModal && <ReturnConfirmModal loan={returnModal} onConfirm={handleConfirmReturn} onClose={() => setReturnModal(null)} />}
      {toast && <Toast msg={toast} />}
      <div className="flex flex-col gap-4">
        {myOverdue.map((loan) => (
          <div key={loan.id} className="flex gap-3 p-3 bg-red-50 border border-red-300 rounded-xl text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div>
              <div className="font-semibold">Overdue: &quot;{loan.book_title}&quot;</div>
              <div className="mt-0.5 text-red-700">Due <span className="font-mono font-medium">{formatISODate(loan.due_date)}</span> — <span className="font-semibold">{daysOverdue(loan.due_date)} days overdue.</span> Please return this to the library immediately.</div>
            </div>
          </div>
        ))}
        {myUpcoming.map((loan) => (
          <div key={loan.id} className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <Clock size={15} className="shrink-0 text-amber-600 mt-0.5" />
            <div><span className="font-semibold">Due soon:</span> &quot;{loan.book_title}&quot; is due on <span className="font-mono font-medium">{formatISODate(loan.due_date)}</span> — {daysUntilDue(loan.due_date) === 0 ? "due today" : `${daysUntilDue(loan.due_date)} day${daysUntilDue(loan.due_date) > 1 ? "s" : ""} remaining`}.</div>
          </div>
        ))}

        <div className="flex gap-1 border-b border-border">
          {studentTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {tab === "library" && <LibraryTab books={books} loans={loans} user={user} onBorrow={onBorrow} />}

        {tab === "loans" && (
          myActiveLoans.length === 0
            ? <div className="text-center py-14 text-muted-foreground text-sm border border-dashed border-border rounded-xl">You have no active loans.</div>
            : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pagedActiveLoans.map((loan) => {
                    const isOverdue = loan.status === "Overdue";
                    const isRequested = loan.status === "Requested";
                    const isReturnRequested = loan.status === "Return Requested";
                    const canRequestReturn = loan.status === "Active" || loan.status === "Overdue";
                    return (
                      <div key={loan.id} className={`border rounded-xl p-3.5 flex gap-3 ${isOverdue ? "bg-red-50 border-red-200" : isRequested ? "bg-blue-50 border-blue-200" : isReturnRequested ? "bg-violet-50 border-violet-200" : "bg-card border-border"}`}>
                        <div className={`w-10 h-14 rounded flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-100" : isRequested ? "bg-blue-100" : isReturnRequested ? "bg-violet-100" : "bg-primary/10"}`}>
                          <BookOpen size={16} className={isOverdue ? "text-red-600" : isRequested ? "text-blue-600" : isReturnRequested ? "text-violet-600" : "text-primary"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm leading-snug">{loan.book_title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{loan.author}</div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {!isRequested && (
                              <>
                                <Clock size={11} className={isOverdue ? "text-red-500" : "text-muted-foreground"} />
                                <span className={`text-xs font-mono font-medium ${isOverdue ? "text-red-700" : "text-muted-foreground"}`}>Due {formatISODate(loan.due_date)}</span>
                              </>
                            )}
                            <StatusBadge status={loan.status} />
                          </div>
                          {isRequested && <p className="text-xs text-blue-600 mt-1.5">Awaiting librarian approval.</p>}
                          {isReturnRequested && <p className="text-xs text-violet-600 mt-1.5">Return pending librarian confirmation.</p>}
                          {canRequestReturn && (
                            <button onClick={() => setReturnModal(loan)}
                              className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border text-muted-foreground rounded-lg hover:bg-secondary hover:text-foreground transition-colors">
                              <RefreshCw size={11} /> Request Return
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pager page={currentLoanPage} total={myActiveLoans.length} perPage={PER_PAGE} onChange={setLoanPage} />
              </>
            )
        )}

        {tab === "history" && <HistoryTab logs={studentLogs} showStudentInfo={false} />}
      </div>
    </>
  );
}
