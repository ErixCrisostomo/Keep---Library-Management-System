"use client";

import { useMemo, useState } from "react";
import { Search, Clock } from "lucide-react";
import { Book, Loan } from "@/lib/types";
import { PER_PAGE } from "@/lib/constants";
import { daysOverdue, formatDateTime, formatISODate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared";
import { Pager } from "@/components/Pager";

export function BorrowedTab({ books, loans }: { books: Book[]; loans: Loan[] }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"due-latest" | "due-oldest" | "student" | "book">("due-latest");
  const [filters, setFilters] = useState({ active: true, overdue: true });

  const types = loans.filter((l) => l.status === "Active" || l.status === "Overdue");

  const selectedKeys = Object.entries(filters).filter(([, v]) => v).map(([k]) => k);
  const filteredByStatus = selectedKeys.length > 0 ? types.filter((l) => (l.status === "Overdue" ? filters.overdue : filters.active)) : [];

  const qNorm = q.trim().toLowerCase();
  const matchesQuery = (l: Loan) => {
    if (!qNorm) return true;
    if ((l.book_title || "").toLowerCase().includes(qNorm)) return true;
    if ((l.author || "").toLowerCase().includes(qNorm)) return true;
    if ((l.student_name || "").toLowerCase().includes(qNorm)) return true;
    if ((l.student_login_id || "").toLowerCase().includes(qNorm)) return true;
    if ((l.book_id || "").toLowerCase().includes(qNorm)) return true;
    return false;
  };

  const filtered = useMemo(() => {
    const base = selectedKeys.length > 0 ? types.filter((l) => (l.status === "Overdue" ? filters.overdue : filters.active)) : [];
    const matched = (selectedKeys.length > 0 ? base : types).filter(matchesQuery);
    if (sort === "student") return matched.sort((a, b) => a.student_name.localeCompare(b.student_name));
    if (sort === "book") return matched.sort((a, b) => a.book_title.localeCompare(b.book_title));
    if (sort === "due-oldest") return matched.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    return matched.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [types, q, sort, filters]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Borrowed Items</h2>
        <span className="text-xs font-mono text-muted-foreground">{types.length} loan{types.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap p-2 bg-card border border-border rounded-lg">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full pl-9 pr-4 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Search by book, author, student, or ID" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-2">
          <label className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-md border ${filters.active ? "border-amber-200 bg-amber-50" : "border-border bg-transparent"}`}>
            <input type="checkbox" checked={filters.active} onChange={(e) => { setFilters((s) => ({ ...s, active: e.target.checked })); setPage(1); }} className="w-4 h-4" />
            Active
          </label>
          <label className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-md border ${filters.overdue ? "border-amber-200 bg-amber-50" : "border-border bg-transparent"}`}>
            <input type="checkbox" checked={filters.overdue} onChange={(e) => { setFilters((s) => ({ ...s, overdue: e.target.checked })); setPage(1); }} className="w-4 h-4" />
            Overdue
          </label>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Sort:</label>
          <select value={sort} onChange={(e) => { setSort(e.target.value as any); setPage(1); }} className="text-xs px-2.5 py-1.5 bg-input-background border border-border rounded-lg">
            <option value="due-latest">Due (Latest)</option>
            <option value="due-oldest">Due (Oldest)</option>
            <option value="student">Student</option>
            <option value="book">Book</option>
          </select>
        </div>
      </div>

      {types.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No borrowed items.</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No loans match your filters.</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                {["Book", "Student", "SR Code", "Borrowed", "Due Date", "Status"].map((h, i) => (
                  <th key={h} className={`text-left px-2 py-2 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider ${i === 0 ? "" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((loan, i) => (
                <tr key={loan.id} className={`border-b border-border last:border-0 transition-colors hover:bg-muted/40 ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                  <td className="px-2 py-2">
                    <div className="font-medium leading-snug truncate">{loan.book_title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{loan.author}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">Book ID: <span className="font-mono">{loan.book_id}</span></div>
                  </td>
                  <td className="px-2 py-1.5"><div className="font-medium truncate">{loan.student_name}</div></td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{loan.student_login_id}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{formatDateTime(loan.borrow_date)}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">{formatISODate(loan.due_date)}{loan.status === "Overdue" && <div className="text-[10px] text-red-500 mt-0.5">+{daysOverdue(loan.due_date)} days</div>}</td>
                  <td className="px-2 py-1.5"><StatusBadge status={loan.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
    </div>
  );
}
