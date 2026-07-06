"use client";

import { useMemo, useState } from "react";
import { Search, ArrowLeftRight, XCircle, CheckCircle2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Book, Loan, SortOption, StudentProfile } from "@/lib/types";
import { PER_PAGE } from "@/lib/constants";
import { daysOverdue, formatDateTime, formatISODate } from "@/lib/utils";
import { GenreChip, StatusBadge, Toast } from "@/components/shared";
import { Pager } from "@/components/Pager";
import { SortSelect } from "@/components/SortSelect";

type CheckoutMode = "checkout" | "return" | "requests";
type RequestFilter = "all" | "borrow" | "return";
type RequestSort = "newest" | "oldest" | "student" | "book";

interface CheckoutTabProps {
  books: Book[];
  loans: Loan[];
  students: StudentProfile[];
  onCheckout: (loginId: string, bookId: string) => Promise<string | null>;
  onReturn: (loanId: string) => Promise<void>;
  onApproveBorrow: (loanId: string) => Promise<void>;
  onRejectBorrow: (loanId: string) => Promise<void>;
  onApproveReturn: (loanId: string) => Promise<void>;
  onRejectReturn?: (loanId: string) => Promise<void>;
  initialMode?: CheckoutMode;
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  const q = query.trim().toLowerCase();
  return q.length > 0 && values.some((value) => (value ?? "").toLowerCase().includes(q));
}

function SuggestionList<T>({
  items,
  render,
  onPick,
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  onPick: (item: T) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
      {items.map((item, i) => (
        <button key={i} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(item)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors">
          {render(item)}
        </button>
      ))}
    </div>
  );
}

export function CheckoutTab({
  books, loans, students, onCheckout, onReturn, onApproveBorrow, onRejectBorrow, onApproveReturn, onRejectReturn, initialMode,
}: CheckoutTabProps) {
  const [mode, setMode] = useState<CheckoutMode>(initialMode ?? "checkout");
  const [loginId, setLoginId] = useState("");
  const [bookId, setBookId] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [lookedUp, setLookedUp] = useState(false);
  const [studentSuggestOpen, setStudentSuggestOpen] = useState(false);
  const [bookSuggestOpen, setBookSuggestOpen] = useState(false);
  const [lookupSuggestOpen, setLookupSuggestOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [toast, setToast] = useState("");
  const [borrowedSearch, setBorrowedSearch] = useState("");
  const [borrowedSort, setBorrowedSort] = useState<SortOption>("az");
  const [borrowedPage, setBorrowedPage] = useState(1);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("all");
  const [requestSort, setRequestSort] = useState<RequestSort>("newest");
  const [requestPage, setRequestPage] = useState(1);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const pendingBorrows = loans.filter((l) => l.status === "Requested");
  const pendingReturns = loans.filter((l) => l.status === "Return Requested");
  const borrowedLoans = loans.filter((l) => l.status === "Active" || l.status === "Overdue");
  const requestLoans = [...pendingBorrows, ...pendingReturns];

  const studentSuggestions = loginId.trim().length < 2 ? [] : students
    .filter((s) => matchesQuery([s.name, s.login_id, s.section, s.course], loginId))
    .slice(0, 5);

  const bookSuggestions = bookId.trim().length < 1 ? [] : books
    .filter((b) => matchesQuery([b.title, b.author, b.id, b.isbn], bookId))
    .slice(0, 5);

  const lookupSuggestions = lookupId.trim().length < 1 ? [] : borrowedLoans
    .filter((l) => matchesQuery([l.book_title, l.book_id, l.student_name, l.student_login_id, l.id], lookupId))
    .slice(0, 6);

  const filteredBorrowed = useMemo(() => {
    const q = borrowedSearch.toLowerCase();
    const matched = borrowedLoans.filter((l) => !q || l.book_title.toLowerCase().includes(q) || l.author.toLowerCase().includes(q)
      || l.student_name.toLowerCase().includes(q) || l.student_login_id.includes(q) || l.book_id.toLowerCase().includes(q));

    if (borrowedSort === "za") return [...matched].sort((a, b) => b.book_title.localeCompare(a.book_title));
    if (borrowedSort === "avail-desc") return [...matched].sort((a, b) => (books.find((x) => x.id === b.book_id)?.available ?? 0) - (books.find((x) => x.id === a.book_id)?.available ?? 0));
    if (borrowedSort === "avail-asc") return [...matched].sort((a, b) => (books.find((x) => x.id === a.book_id)?.available ?? 0) - (books.find((x) => x.id === b.book_id)?.available ?? 0));
    return [...matched].sort((a, b) => a.book_title.localeCompare(b.book_title));
  }, [books, borrowedLoans, borrowedSearch, borrowedSort]);

  const pagedBorrowed = filteredBorrowed.slice((borrowedPage - 1) * PER_PAGE, borrowedPage * PER_PAGE);

  const filteredRequests = useMemo(() => {
    const q = requestSearch.toLowerCase();
    const matched = requestLoans.filter((l) => {
      const matchesType = requestFilter === "all"
        || (requestFilter === "borrow" && l.status === "Requested")
        || (requestFilter === "return" && l.status === "Return Requested");
      const matchesText = !q || l.book_title.toLowerCase().includes(q) || l.author.toLowerCase().includes(q)
        || l.student_name.toLowerCase().includes(q) || l.student_login_id.includes(q) || l.book_id.toLowerCase().includes(q);
      return matchesType && matchesText;
    });

    if (requestSort === "oldest") return [...matched].sort((a, b) => a.borrow_date.localeCompare(b.borrow_date));
    if (requestSort === "student") return [...matched].sort((a, b) => a.student_name.localeCompare(b.student_name));
    if (requestSort === "book") return [...matched].sort((a, b) => a.book_title.localeCompare(b.book_title));
    return [...matched].sort((a, b) => b.borrow_date.localeCompare(a.borrow_date));
  }, [requestFilter, requestLoans, requestSearch, requestSort]);

  const pagedRequests = filteredRequests.slice((requestPage - 1) * PER_PAGE, requestPage * PER_PAGE);

  const lookupResults = lookedUp
    ? borrowedLoans.filter((l) => matchesQuery([l.student_login_id, l.student_name, l.book_id, l.book_title, l.id], lookupId))
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
    { id: "requests", label: `Requests${requestLoans.length > 0 ? ` (${requestLoans.length})` : ""}` },
  ];

  return (
    <>
      {toast && <Toast msg={toast} />}
      <div className="flex flex-col gap-4">
        <div className="flex rounded-xl border border-border overflow-hidden">
          {modes.map((m) => (
            <button key={m.id} onClick={() => { setMode(m.id); setErrorMsg(""); setSuccessMsg(""); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${mode === m.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
              {m.label}
              {m.id === "requests" && requestLoans.length > 0 && mode !== "requests" && (
                <span className="absolute top-2 right-3 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {mode === "checkout" && (
          <div className="flex flex-col gap-2.5 max-w-2xl">
            <div className="relative">
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Student Number</label>
              <input className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
                placeholder="Type a student name or number" value={loginId}
                onChange={(e) => { setLoginId(e.target.value); setStudentSuggestOpen(e.target.value.trim().length >= 2); }}
                onFocus={() => setStudentSuggestOpen(loginId.trim().length >= 2)} />
              {studentSuggestOpen && studentSuggestions.length > 0 && (
                <SuggestionList
                  items={studentSuggestions}
                  onPick={(s) => { setLoginId(s.login_id); setStudentSuggestOpen(false); }}
                  render={(s) => (
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{s.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{s.login_id}</span>
                    </div>
                  )}
                />
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Book ID</label>
              <input className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
                placeholder="Type a book title or ID" value={bookId}
                onChange={(e) => { setBookId(e.target.value); setBookSuggestOpen(e.target.value.trim().length >= 1); }}
                onFocus={() => setBookSuggestOpen(bookId.trim().length >= 1)} />
              {bookSuggestOpen && bookSuggestions.length > 0 && (
                <SuggestionList
                  items={bookSuggestions}
                  onPick={(b) => { setBookId(b.id); setBookSuggestOpen(false); }}
                  render={(b) => (
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium truncate">{b.title}</span>
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{b.id}</span>
                    </div>
                  )}
                />
              )}
            </div>
            {errorMsg && <div className="flex gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><XCircle size={15} className="shrink-0 mt-0.5" />{errorMsg}</div>}
            {successMsg && <div className="flex gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"><CheckCircle2 size={15} className="shrink-0 mt-0.5" />{successMsg}</div>}
            <button onClick={handleCheckout} className="flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
              <ArrowLeftRight size={15} /> Process Checkout
            </button>
          </div>
        )}

        {mode === "return" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Lookup by student, book, or loan</label>
                <div className="relative">
                  <div className="flex gap-2">
                    <input className="flex-1 px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
                      placeholder="Start typing a student or book" value={lookupId}
                      onChange={(e) => { setLookupId(e.target.value); setLookedUp(false); setSuccessMsg(""); setLookupSuggestOpen(e.target.value.trim().length >= 1); }}
                      onFocus={() => setLookupSuggestOpen(lookupId.trim().length >= 1)} />
                    <button onClick={() => { setLookedUp(true); setSuccessMsg(""); }} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">Lookup</button>
                  </div>
                  {lookupSuggestOpen && lookupSuggestions.length > 0 && (
                    <SuggestionList
                      items={lookupSuggestions}
                      onPick={(loan) => { setLookupId(loan.id); setLookedUp(true); setLookupSuggestOpen(false); }}
                      render={(loan) => (
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">{loan.book_title} - {loan.student_name}</span>
                          <span className="font-mono text-xs text-muted-foreground shrink-0">{loan.id}</span>
                        </div>
                      )}
                    />
                  )}
                </div>
              </div>
              {successMsg && <div className="flex gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"><CheckCircle2 size={15} className="shrink-0 mt-0.5" />{successMsg}</div>}
              {lookedUp && (
                lookupResults.length === 0
                  ? <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">No active loans found for &quot;{lookupId}&quot;.</div>
                  : <div className="flex flex-col gap-2">
                      {lookupResults.map((loan) => (
                        <div key={loan.id} className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 ${loan.status === "Overdue" ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{loan.book_title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">{loan.student_name} · <span className="font-mono">{loan.student_login_id}</span></div>
                            <div className="text-xs text-muted-foreground font-mono mt-1">Due {formatISODate(loan.due_date)}</div>
                          </div>
                          <button onClick={() => handleReturn(loan)} className="shrink-0 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                            Confirm Return
                          </button>
                        </div>
                      ))}
                    </div>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Return Requests Pending Approval</div>
              {pendingReturns.length === 0
                ? <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">No pending return requests.</div>
                : <div className="flex flex-col gap-2">
                    {pendingReturns.slice(0, 5).map((loan) => (
                      <div key={loan.id} className="p-2 rounded-xl border border-violet-200 bg-violet-50 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{loan.book_title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{loan.student_name} · <span className="font-mono">{loan.student_login_id}</span></div>
                          <div className="text-xs text-muted-foreground font-mono mt-1">Requested on {formatISODate(loan.borrow_date)}</div>
                        </div>
                        <div className="flex gap-2">
                          {onRejectReturn && (
                            <button onClick={() => { void onRejectReturn(loan.id); showToast(`"${loan.book_title}" return rejected.`); }}
                              className="shrink-0 px-3 py-1.5 text-xs font-medium border border-border text-muted-foreground rounded-lg hover:bg-secondary transition-colors">
                              Reject
                            </button>
                          )}
                          <button onClick={() => { void onApproveReturn(loan.id); showToast(`"${loan.book_title}" return approved.`); }}
                            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {mode === "requests" && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-1 items-center flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input className="w-full pl-9 pr-4 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Search requests by book, student, or ID" value={requestSearch}
                  onChange={(e) => { setRequestSearch(e.target.value); setRequestPage(1); }} />
              </div>
              <select value={requestFilter} onChange={(e) => { setRequestFilter(e.target.value as RequestFilter); setRequestPage(1); }}
                className="text-xs px-2.5 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground">
                <option value="all">All Requests</option>
                <option value="borrow">Borrow</option>
                <option value="return">Return</option>
              </select>
              <select value={requestSort} onChange={(e) => { setRequestSort(e.target.value as RequestSort); setRequestPage(1); }}
                className="text-xs px-2.5 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="student">Student</option>
                <option value="book">Book</option>
              </select>
            </div>
            <div className="text-xs text-muted-foreground font-mono">{filteredRequests.length} of {requestLoans.length} request{requestLoans.length !== 1 ? "s" : ""}</div>
            {pagedRequests.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-10 border border-dashed border-border rounded-xl">No requests match the current filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pagedRequests.map((loan) => {
                  const isBorrow = loan.status === "Requested";
                  const book = books.find((b) => b.id === loan.book_id);
                  return (
                    <div key={loan.id} className={`p-1.5 rounded-xl border ${isBorrow ? "border-blue-200 bg-blue-50" : "border-violet-200 bg-violet-50"}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{loan.book_title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{loan.student_name} · <span className="font-mono">{loan.student_login_id}</span></div>
                          <div className="text-[10px] text-muted-foreground mt-1">{isBorrow ? "Requested" : "Due"} {formatISODate(isBorrow ? loan.borrow_date : loan.due_date)}</div>
                        </div>
                        <StatusBadge status={loan.status} />
                      </div>
                      {isBorrow && book && book.available === 0 && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded mb-2">No copies available - cannot approve.</div>
                      )}
                      {isBorrow ? (
                        <div className="flex gap-2">
                          <button onClick={() => { void onRejectBorrow(loan.id); showToast(`Request for "${loan.book_title}" rejected.`); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium border border-border text-muted-foreground rounded-lg hover:bg-secondary transition-colors">
                            <ThumbsDown size={12} /> Reject
                          </button>
                          <button disabled={!book || book.available === 0}
                            onClick={() => { void onApproveBorrow(loan.id); showToast(`"${loan.book_title}" approved for ${loan.student_name}.`); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                            <ThumbsUp size={12} /> Approve
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {onRejectReturn && (
                            <button onClick={() => { void onRejectReturn(loan.id); showToast(`"${loan.book_title}" return rejected.`); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium border border-border text-muted-foreground rounded-lg hover:bg-secondary transition-colors">
                              <ThumbsDown size={12} /> Reject
                            </button>
                          )}
                          <button onClick={() => { void onApproveReturn(loan.id); showToast(`"${loan.book_title}" return approved.`); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                            <ThumbsUp size={12} /> Approve Return
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <Pager page={requestPage} total={filteredRequests.length} perPage={PER_PAGE} onChange={setRequestPage} />
          </div>
        )}

        {/* Borrowed tab moved to a top-level Librarian tab; retained here only: checkout/return/requests */}
      </div>
    </>
  );
}
