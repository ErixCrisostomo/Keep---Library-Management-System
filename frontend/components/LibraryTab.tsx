"use client";

import { useState } from "react";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { AuthUser, Book, Loan, SortOption } from "@/lib/types";
import { ALL_GENRES, PER_PAGE } from "@/lib/constants";
import { sortBooks } from "@/lib/utils";
import { AvailabilityBar, GenreChip, StatusBadge } from "@/components/shared";
import { BorrowConfirmModal } from "@/components/ConfirmModals";
import { Pager } from "@/components/Pager";
import { SortSelect } from "@/components/SortSelect";

interface LibraryTabProps {
  books: Book[];
  loans: Loan[];
  user: AuthUser;
  onBorrow: (bookId: string) => Promise<string | null>;
}

export function LibraryTab({ books, loans, user, onBorrow }: LibraryTabProps) {
  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [sort, setSort] = useState<SortOption>("az");
  const [page, setPage] = useState(1);
  const [confirmBook, setConfirmBook] = useState<Book | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Search matches title, author, ISBN, AND genre — lets students search by category right in the search bar.
  const filtered = sortBooks(books.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch = b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
      || b.isbn.includes(q) || b.genre.toLowerCase().includes(q);
    return matchesSearch && (activeGenre === "All" || b.genre === activeGenre);
  }), sort);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleConfirmBorrow = async () => {
    if (!confirmBook) return;
    const err = await onBorrow(confirmBook.id);
    setFeedback({ msg: err ?? `Request submitted for "${confirmBook.title}". Awaiting librarian approval.`, ok: !err });
    setConfirmBook(null);
    setTimeout(() => setFeedback(null), 5000);
  };

  const getLoanStatus = (bookId: string) => {
    const loan = loans.find((l) => l.student_login_id === user.login_id && l.book_id === bookId && l.status !== "Returned");
    return loan ? loan.status : null;
  };

  return (
    <>
      {confirmBook && <BorrowConfirmModal book={confirmBook} onConfirm={handleConfirmBorrow} onClose={() => setConfirmBook(null)} />}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="w-full pl-9 pr-4 py-2.5 text-sm bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Search by title, author, ISBN, or category…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <SortSelect value={sort} onChange={(v) => { setSort(v); setPage(1); }} />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {ALL_GENRES.map((g) => (
            <button key={g} onClick={() => { setActiveGenre(g); setPage(1); }}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${activeGenre === g ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>
              {g}
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {filtered.length} title{filtered.length !== 1 ? "s" : ""} · {filtered.filter((b) => b.available > 0).length} available
          {activeGenre !== "All" && <span> in <span className="text-foreground">{activeGenre}</span></span>}
          {search && <span> matching &quot;<span className="text-foreground">{search}</span>&quot;</span>}
        </div>

        {feedback && (
          <div className={`flex gap-2 p-3 rounded-xl text-sm border ${feedback.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {feedback.ok ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <XCircle size={15} className="shrink-0 mt-0.5" />}
            {feedback.msg}
          </div>
        )}

        {filtered.length === 0
          ? <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No books found.</div>
          : (
            <>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-auto" />
                    <col className="w-28" />
                    <col className="hidden md:table-column md:w-40" />
                    <col className="w-32" />
                    <col className="w-24" />
                  </colgroup>
                  <thead>
                    <tr className="bg-secondary border-b border-border">
                      {["Title / Author", "Genre", "ISBN", "Availability", ""].map((h, i) => (
                        <th key={i} className={`text-left px-4 py-3 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider ${i === 2 ? "hidden md:table-cell" : ""} ${i === 4 ? "text-right" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((book, i) => {
                      const existingStatus = getLoanStatus(book.id);
                      return (
                        <tr key={book.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                          <td className="px-4 py-3 min-w-0">
                            <div className="font-medium leading-snug truncate" title={book.title}>{book.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate" title={book.author}>{book.author}</div>
                          </td>
                          <td className="px-4 py-3"><GenreChip genre={book.genre} small /></td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell truncate">{book.isbn}</td>
                          <td className="px-4 py-3">
                            {book.available === 0
                              ? <span className="inline-flex items-center whitespace-nowrap text-xs font-serif font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">Out of Stock</span>
                              : <AvailabilityBar available={book.available} total={book.total} />}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {existingStatus
                              ? <StatusBadge status={existingStatus} />
                              : book.available > 0
                                ? <button onClick={() => setConfirmBook(book)} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium transition-opacity">Borrow</button>
                                : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </>
          )}
      </div>
    </>
  );
}
