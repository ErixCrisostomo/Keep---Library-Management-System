"use client";

import { useState } from "react";
import { Search, ArrowLeftRight, XCircle, CheckCircle2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Book, Loan } from "@/lib/types";
import { daysOverdue, formatISODate } from "@/lib/utils";
import { StatusBadge, Toast } from "@/components/shared";

type CheckoutMode = "checkout" | "return" | "requests" | "borrowed";

interface CheckoutTabProps {
  books: Book[];
  loans: Loan[];
  onCheckout: (loginId: string, bookId: string) => Promise<string | null>;
  onReturn: (loanId: string) => Promise<void>;
  onApproveBorrow: (loanId: string) => Promise<void>;
  onRejectBorrow: (loanId: string) => Promise<void>;
  onApproveReturn: (loanId: string) => Promise<void>;
  initialMode?: CheckoutMode;
}

export function CheckoutTab({
  books, loans, onCheckout, onReturn, onApproveBorrow, onRejectBorrow, onApproveReturn, initialMode,
}: CheckoutTabProps) {
  const [mode, setMode] = useState<CheckoutMode>(initialMode ?? "checkout");
  const [loginId, setLoginId] = useState("");
  const [bookId, setBookId] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [lookedUp, setLookedUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [toast, setToast] = useState("");
  const [borrowedSearch, setBorrowedSearch] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const nonReturnedLoans = loans.filter((l) => l.status !== "Returned");
  const pendingBorrows = loans.filter((l) => l.status === "Requested");
  const pendingReturns = loans.filter((l) => l.status === "Return Requested");
  const borrowedLoans = loans.filter((l) => l.status === "Active" || l.status === "Overdue");

  const filteredBorrowed = borrowedLoans.filter((l) => {
    const q = borrowedSearch.toLowerCase();
    return !q || l.book_title.toLowerCase().includes(q) || l.author.toLowerCase().includes(q)
      || l.student_name.toLowerCase().includes(q) || l.student_login_id.includes(q) || l.book_id.toLowerCase().includes(q);
  });

  const lookupResults = lookedUp
    ? nonReturnedLoans.filter((l) => l.student_login_id === lookupId.trim() || l.book_id === lookupId.trim().toUpperCase())
    : [];

  const handleCheckout = async () => {
    setErrorMsg(""); setSuccessMsg("");
    const err = await onCheckout(loginId.trim(), bookId.trim().toUpperCase());
    if (err) { setErrorMsg(err); return; }
    const book = books.find((b) => b.id === bookId.trim().toUpperCase());
    setSuccessMsg(`"${book?.title}" checked out to ${loginId.trim()}.`);
    setLoginId(""); setBookId("");
  };

  const handleReturn = async (loan: Loan) => {
    await onReturn(loan.id);
    setSuccessMsg(`"${loan.book_title}" returned. Inventory updated.`);
    setLookedUp(false); setLookupId("");
  };

  const modes: { id: CheckoutMode; label: string }[] = [
    { id: "checkout", label: "Checkout" },
    { id: "return", label: "Return" },
    { id: "requests", label: `Requests${pendingBorrows.length + pendingReturns.length > 0 ? ` (${pendingBorrows.length + pendingReturns.length})` : ""}` },
    { id: "borrowed", label: `Borrowed (${borrowedLoans.length})` },
  ];

  return (
    <>
      {toast && <Toast msg={toast} />}
      <div className="flex flex-col gap-5">
        <div className="flex rounded-xl border border-border overflow-hidden">
          {modes.map((m) => (
            <button key={m.id} onClick={() => { setMode(m.id); setErrorMsg(""); setSuccessMsg(""); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${mode === m.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
              {m.label}
              {m.id === "requests" && (pendingBorrows.length + pendingReturns.length > 0) && mode !== "requests" && (
                <span className="absolute top-2 right-3 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {mode === "checkout" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Student Number / Email</label>
                <input className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
                  placeholder="e.g. 24-00312" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Book ID</label>
                <input className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
                  placeholder="e.g. B-00003" value={bookId} onChange={(e) => setBookId(e.target.value)} />
              </div>
              {errorMsg && <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><XCircle size={15} className="shrink-0 mt-0.5" />{errorMsg}</div>}
              {successMsg && <div className="flex gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"><CheckCircle2 size={15} className="shrink-0 mt-0.5" />{successMsg}</div>}
              <button onClick={handleCheckout} className="flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                <ArrowLeftRight size={15} /> Process Checkout
              </button>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">All Active &amp; Overdue Loans</div>
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                {nonReturnedLoans.filter((l) => l.status === "Active" || l.status === "Overdue").map((loan) => (
                  <div key={loan.id} className={`p-3 rounded-xl border ${loan.status === "Overdue" ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium leading-snug">{loan.book_title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{loan.student_name} · {loan.student_login_id}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="font-mono text-xs text-muted-foreground">Due {formatISODate(loan.due_date)}</span>
                          <StatusBadge status={loan.status} />
                        </div>
                      </div>
                      {loan.status === "Overdue" && <span className="text-xs font-mono font-medium text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded shrink-0">+{daysOverdue(loan.due_date)}d</span>}
                    </div>
                  </div>
                ))}
                {nonReturnedLoans.filter((l) => l.status === "Active" || l.status === "Overdue").length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No active loans.</div>}
              </div>
            </div>
          </div>
        )}

        {mode === "return" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Lookup by Student Number or Book ID</label>
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
                    placeholder="e.g. 24-00312 or B-00003" value={lookupId}
                    onChange={(e) => { setLookupId(e.target.value); setLookedUp(false); setSuccessMsg(""); }} />
                  <button onClick={() => { setLookedUp(true); setSuccessMsg(""); }} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">Lookup</button>
                </div>
              </div>
              {successMsg && <div className="flex gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"><CheckCircle2 size={15} className="shrink-0 mt-0.5" />{successMsg}</div>}
              {lookedUp && (
                lookupResults.length === 0
                  ? <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">No active loans found for &quot;{lookupId}&quot;.</div>
                  : <div className="flex flex-col gap-2">
                      {lookupResults.map((loan) => (
                        <div key={loan.id} className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${loan.status === "Overdue" ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                          <div>
                            <div className="text-sm font-medium">{loan.book_title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{loan.student_name} · Due {formatISODate(loan.due_date)}</div>
                            <div className="mt-1"><StatusBadge status={loan.status} /></div>
                          </div>
                          {loan.status === "Active" && (
                            <button onClick={() => handleReturn(loan)} className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                              Confirm Return
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">Return Requests Pending Approval</div>
              {pendingReturns.length === 0
                ? <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">No pending return requests.</div>
                : <div className="flex flex-col gap-2">
                    {pendingReturns.map((loan) => (
                      <div key={loan.id} className="p-3 rounded-xl border border-violet-200 bg-violet-50 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">{loan.book_title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{loan.student_name} · {loan.student_login_id}</div>
                          <div className="mt-1"><StatusBadge status="Return Requested" /></div>
                        </div>
                        <button onClick={() => { onApproveReturn(loan.id); showToast(`"${loan.book_title}" return approved.`); }}
                          className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                          Approve Return
                        </button>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {mode === "requests" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Borrow Requests ({pendingBorrows.length})
              </h3>
              {pendingBorrows.length === 0
                ? <div className="text-sm text-muted-foreground text-center py-10 border border-dashed border-border rounded-xl">No pending borrow requests.</div>
                : <div className="flex flex-col gap-2">
                    {pendingBorrows.map((loan) => {
                      const book = books.find((b) => b.id === loan.book_id);
                      return (
                        <div key={loan.id} className="p-3 rounded-xl border border-blue-200 bg-blue-50">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="text-sm font-medium">{loan.book_title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{loan.student_name} · <span className="font-mono">{loan.student_login_id}</span></div>
                              <div className="text-xs text-muted-foreground mt-0.5">Requested {formatISODate(loan.borrow_date)}</div>
                            </div>
                            <StatusBadge status="Requested" />
                          </div>
                          {book && book.available === 0 && (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded mb-2">⚠ No copies available — cannot approve.</div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => { onRejectBorrow(loan.id); showToast(`Request for "${loan.book_title}" rejected.`); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border border-border text-muted-foreground rounded-lg hover:bg-secondary transition-colors">
                              <ThumbsDown size={12} /> Reject
                            </button>
                            <button
                              disabled={!book || book.available === 0}
                              onClick={() => { onApproveBorrow(loan.id); showToast(`"${loan.book_title}" approved for ${loan.student_name}.`); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                              <ThumbsUp size={12} /> Approve
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                Return Requests ({pendingReturns.length})
              </h3>
              {pendingReturns.length === 0
                ? <div className="text-sm text-muted-foreground text-center py-10 border border-dashed border-border rounded-xl">No pending return requests.</div>
                : <div className="flex flex-col gap-2">
                    {pendingReturns.map((loan) => (
                      <div key={loan.id} className="p-3 rounded-xl border border-violet-200 bg-violet-50">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm font-medium">{loan.book_title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{loan.student_name} · <span className="font-mono">{loan.student_login_id}</span></div>
                            <div className="text-xs text-muted-foreground mt-0.5">Due {formatISODate(loan.due_date)}</div>
                          </div>
                          <StatusBadge status="Return Requested" />
                        </div>
                        <button onClick={() => { onApproveReturn(loan.id); showToast(`"${loan.book_title}" return approved.`); }}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                          <ThumbsUp size={12} /> Approve Return
                        </button>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {mode === "borrowed" && (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full pl-9 pr-4 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Search by book title, author, student name, or Student Number…"
                value={borrowedSearch} onChange={(e) => setBorrowedSearch(e.target.value)} />
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {filteredBorrowed.length} of {borrowedLoans.length} active loan{borrowedLoans.length !== 1 ? "s" : ""}
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    {["Book", "Book ID", "Student", "Student Number", "Borrowed", "Due Date", "Status"].map((h, i) => (
                      <th key={h} className={`text-left px-4 py-3 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider ${i === 1 || i === 4 ? "hidden md:table-cell" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBorrowed.map((loan, i) => {
                    const book = books.find((b) => b.id === loan.book_id);
                    return (
                      <tr key={loan.id} className={`border-b border-border last:border-0 transition-colors hover:bg-muted/40 ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium leading-snug">{loan.book_title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{loan.author}</div>
                          {book && <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded mt-1 inline-block">{book.genre}</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{loan.book_id}</td>
                        <td className="px-4 py-3"><div className="font-medium">{loan.student_name}</div></td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{loan.student_login_id}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{formatISODate(loan.borrow_date)}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          <span className={loan.status === "Overdue" ? "text-red-700 font-semibold" : "text-muted-foreground"}>{formatISODate(loan.due_date)}</span>
                          {loan.status === "Overdue" && <div className="text-[10px] text-red-500 mt-0.5">+{daysOverdue(loan.due_date)} days</div>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={loan.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredBorrowed.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {borrowedLoans.length === 0 ? "No books are currently borrowed." : "No loans match your search."}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
