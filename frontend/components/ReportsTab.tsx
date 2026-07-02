"use client";

import {
  Download, BookOpen, CheckCircle2, BookMarked, AlertTriangle, XCircle,
  ArrowLeftRight, Bell, RefreshCw, History,
} from "lucide-react";
import { Book, Loan, StudentProfile, TxLog } from "@/lib/types";
import { daysOverdue, formatDate, formatISODate } from "@/lib/utils";
import { GENRES_LIST } from "@/lib/constants";
import { AvailabilityBar, GenreChip, StatusBadge } from "@/components/shared";

export function ReportsTab({
  books, loans, logs, students,
}: { books: Book[]; loans: Loan[]; logs: TxLog[]; students: StudentProfile[] }) {
  const totalVolumes = books.reduce((s, b) => s + b.total, 0);
  const totalAvailable = books.reduce((s, b) => s + b.available, 0);
  const totalCheckedOut = totalVolumes - totalAvailable;
  const activeLoans = loans.filter((l) => l.status === "Active");
  const overdueLoans = loans.filter((l) => l.status === "Overdue");
  const pendingBorrows = loans.filter((l) => l.status === "Requested");
  const pendingReturns = loans.filter((l) => l.status === "Return Requested");
  const returnedLoans = loans.filter((l) => l.status === "Returned");
  const outOfStock = books.filter((b) => b.available === 0);
  const lowStock = books.filter((b) => b.available > 0 && b.available / b.total < 0.4);
  const utilizationRate = totalVolumes > 0 ? Math.round((totalCheckedOut / totalVolumes) * 100) : 0;

  const titleCounts: Record<string, { title: string; author: string; count: number }> = {};
  logs.filter((l) => l.type === "approve_borrow" || l.type === "direct_checkout").forEach((l) => {
    if (!titleCounts[l.book_title]) titleCounts[l.book_title] = { title: l.book_title, author: l.author, count: 0 };
    titleCounts[l.book_title].count++;
  });
  const topBooks = Object.values(titleCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  const genreStats = GENRES_LIST.map((g) => {
    const genreBooks = books.filter((b) => b.genre === g);
    const gTotal = genreBooks.reduce((s, b) => s + b.total, 0);
    const gAvail = genreBooks.reduce((s, b) => s + b.available, 0);
    const gOut = gTotal - gAvail;
    return { genre: g, titles: genreBooks.length, volumes: gTotal, available: gAvail, checkedOut: gOut, utilPct: gTotal > 0 ? Math.round((gOut / gTotal) * 100) : 0 };
  }).filter((g) => g.titles > 0);

  const studentActivity = students.map((s) => {
    const sLoans = loans.filter((l) => l.student_login_id === s.login_id);
    const sActive = sLoans.filter((l) => l.status === "Active").length;
    const sOverdue = sLoans.filter((l) => l.status === "Overdue").length;
    const sReturned = sLoans.filter((l) => l.status === "Returned").length;
    const sTx = logs.filter((l) => l.student_login_id === s.login_id).length;
    return { ...s, active: sActive, overdue: sOverdue, returned: sReturned, transactions: sTx, total: sActive + sReturned };
  }).filter((s) => s.total > 0 || s.transactions > 0).sort((a, b) => b.total - a.total);

  const exportReport = () => {
    const sep = (t: string) => ["", `=== ${t} ===`];
    const lines: string[] = [
      "KEEP LIBRARY MANAGEMENT SYSTEM",
      `Report Generated: ${formatDate(new Date())}`,
      ...sep("EXECUTIVE SUMMARY"),
      `Total Book Titles: ${books.length}`,
      `Total Volumes: ${totalVolumes}`,
      `Available Copies: ${totalAvailable}`,
      `Checked Out: ${totalCheckedOut}`,
      `Collection Utilization: ${utilizationRate}%`,
      `Out of Stock Titles: ${outOfStock.length}`,
      `Low Stock Titles: ${lowStock.length}`,
      ...sep("LOAN STATISTICS"),
      `Active Loans: ${activeLoans.length}`,
      `Overdue Items: ${overdueLoans.length}`,
      `Pending Borrow Requests: ${pendingBorrows.length}`,
      `Pending Return Requests: ${pendingReturns.length}`,
      `Total Returned (all time): ${returnedLoans.length}`,
      `Total Transactions Logged: ${logs.length}`,
      ...sep("OVERDUE ITEMS"),
      ["Loan ID", "Book Title", "Student", "Student No.", "Due Date", "Days Overdue"].join(","),
      ...overdueLoans.map((l) => [l.id, `"${l.book_title}"`, l.student_name, l.student_login_id, l.due_date, `+${daysOverdue(l.due_date)} days`].join(",")),
      ...sep("ACTIVE LOANS"),
      ["Loan ID", "Book Title", "Student", "Student No.", "Borrow Date", "Due Date"].join(","),
      ...activeLoans.map((l) => [l.id, `"${l.book_title}"`, l.student_name, l.student_login_id, l.borrow_date, l.due_date].join(",")),
      ...sep("PENDING BORROW REQUESTS"),
      ["Loan ID", "Book Title", "Student", "Student No.", "Requested On"].join(","),
      ...pendingBorrows.map((l) => [l.id, `"${l.book_title}"`, l.student_name, l.student_login_id, l.borrow_date].join(",")),
      ...sep("GENRE ANALYTICS"),
      ["Genre", "Titles", "Volumes", "Available", "Checked Out", "Utilization %"].join(","),
      ...genreStats.map((g) => [g.genre, g.titles, g.volumes, g.available, g.checkedOut, `${g.utilPct}%`].join(",")),
      ...sep("TOP BORROWED BOOKS"),
      ["Book Title", "Author", "Times Borrowed"].join(","),
      ...topBooks.map((b) => [`"${b.title}"`, `"${b.author}"`, b.count].join(",")),
      ...sep("STOCK ALERTS — OUT OF STOCK"),
      ["Book ID", "Title", "Author", "Genre", "Total Copies"].join(","),
      ...outOfStock.map((b) => [b.id, `"${b.title}"`, `"${b.author}"`, b.genre, b.total].join(",")),
      ...sep("STUDENT BORROWING ACTIVITY"),
      ["Student No.", "Name", "Section", "Active", "Overdue", "Returned", "Transactions"].join(","),
      ...studentActivity.map((s) => [s.login_id, `"${s.name}"`, s.section ?? "", s.active, s.overdue, s.returned, s.transactions].join(",")),
      ...sep("FULL TRANSACTION LOG"),
      ["Log ID", "Type", "Book Title", "Student", "Student No.", "Timestamp"].join(","),
      ...[...logs].reverse().map((l) => [l.id, l.type, `"${l.book_title}"`, l.student_name, l.student_login_id, `"${l.created_at}"`].join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keep_report_summary_${formatDate(new Date()).replace(/ /g, "_").replace(",", "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-lg font-serif">Library Report</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Generated {formatDate(new Date())} · Live data</p>
        </div>
        <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-secondary transition-colors">
          <Download size={14} /> Export Report Summary
        </button>
      </div>

      <section>
        <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Executive Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Volumes", value: totalVolumes, icon: BookOpen, color: "text-primary", sub: `${books.length} titles` },
            { label: "Available Now", value: totalAvailable, icon: CheckCircle2, color: "text-emerald-600", sub: `${100 - utilizationRate}% of collection` },
            { label: "Checked Out", value: totalCheckedOut, icon: BookMarked, color: "text-amber-600", sub: `${utilizationRate}% utilization` },
            { label: "Overdue Items", value: overdueLoans.length, icon: AlertTriangle, color: "text-red-600", sub: overdueLoans.length > 0 ? "Needs attention" : "All clear" },
            { label: "Active Loans", value: activeLoans.length, icon: ArrowLeftRight, color: "text-primary", sub: "Currently borrowed" },
            { label: "Pending Requests", value: pendingBorrows.length + pendingReturns.length, icon: Bell, color: "text-blue-600", sub: `${pendingBorrows.length} borrow · ${pendingReturns.length} return` },
            { label: "Total Returned", value: returnedLoans.length, icon: RefreshCw, color: "text-stone-500", sub: "All time" },
            { label: "Transactions Logged", value: logs.length, icon: History, color: "text-violet-600", sub: "All time" },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3.5">
              <div className={`${color} mb-1.5`}><Icon size={15} /></div>
              <div className="text-xl font-semibold font-serif">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Stock Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-red-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200">
              <XCircle size={13} className="text-red-600" />
              <span className="text-xs font-semibold text-red-800">Out of Stock ({outOfStock.length})</span>
            </div>
            {outOfStock.length === 0
              ? <div className="text-center py-6 text-muted-foreground text-xs">All titles have available copies.</div>
              : <div className="divide-y divide-red-100">
                  {outOfStock.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2.5 bg-card hover:bg-red-50/30 transition-colors gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium leading-snug truncate">{b.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{b.author}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <GenreChip genre={b.genre} small />
                        <span className="text-xs font-mono text-red-600">0 / {b.total}</span>
                      </div>
                    </div>
                  ))}
                </div>}
          </div>
          <div className="border border-amber-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
              <AlertTriangle size={13} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">Low Stock — &lt;40% Available ({lowStock.length})</span>
            </div>
            {lowStock.length === 0
              ? <div className="text-center py-6 text-muted-foreground text-xs">No low-stock titles.</div>
              : <div className="divide-y divide-amber-100">
                  {lowStock.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2.5 bg-card hover:bg-amber-50/30 transition-colors gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium leading-snug truncate">{b.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{b.author}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <GenreChip genre={b.genre} small />
                        <AvailabilityBar available={b.available} total={b.total} />
                      </div>
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Active Loans ({activeLoans.length + overdueLoans.length})</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                {["Loan ID", "Book", "Student", "Student No.", "Borrowed", "Due Date", "Status"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...overdueLoans, ...activeLoans].map((loan, i) => (
                <tr key={loan.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${loan.status === "Overdue" ? "bg-red-50/40" : i % 2 === 1 ? "bg-card/40" : ""}`}>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{loan.id}</td>
                  <td className="px-3 py-2"><div className="text-sm font-medium leading-snug">{loan.book_title}</div><div className="text-xs text-muted-foreground">{loan.author}</div></td>
                  <td className="px-3 py-2 text-sm">{loan.student_name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{loan.student_login_id}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{formatISODate(loan.borrow_date)}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <span className={loan.status === "Overdue" ? "text-red-700 font-semibold" : "text-muted-foreground"}>{formatISODate(loan.due_date)}</span>
                    {loan.status === "Overdue" && <div className="text-[10px] text-red-500">+{daysOverdue(loan.due_date)} days</div>}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={loan.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeLoans.length + overdueLoans.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No active loans.</div>}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section>
          <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Most Borrowed Books</h3>
          {topBooks.length === 0
            ? <div className="border border-dashed border-border rounded-xl text-center py-8 text-muted-foreground text-sm">No borrow transactions yet.</div>
            : <div className="border border-border rounded-xl overflow-hidden">
                {topBooks.map((b, i) => (
                  <div key={b.title} className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                    <span className="text-xs font-mono font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{b.title}</div>
                      <div className="text-xs text-muted-foreground">{b.author}</div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-primary shrink-0">{b.count}×</span>
                  </div>
                ))}
              </div>}
        </section>

        <section>
          <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Student Borrowing Activity</h3>
          {studentActivity.length === 0
            ? <div className="border border-dashed border-border rounded-xl text-center py-8 text-muted-foreground text-sm">No student activity yet.</div>
            : <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary border-b border-border">
                      {["Student", "Active", "Overdue", "Returned", "Tx"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentActivity.map((s, i) => (
                      <tr key={s.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                        <td className="px-3 py-2">
                          <div className="font-medium leading-snug">{s.name}</div>
                          <div className="font-mono text-muted-foreground text-[10px]">{s.login_id}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-emerald-700">{s.active}</td>
                        <td className="px-3 py-2 font-mono">{s.overdue > 0 ? <span className="text-red-600 font-semibold">{s.overdue}</span> : <span className="text-muted-foreground">0</span>}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{s.returned}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{s.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
        </section>
      </div>

      {(pendingBorrows.length + pendingReturns.length) > 0 && (
        <section>
          <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending Requests ({pendingBorrows.length + pendingReturns.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBorrows.length > 0 && (
              <div className="border border-blue-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs font-semibold text-blue-800">Borrow Requests ({pendingBorrows.length})</div>
                {pendingBorrows.map((l) => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100 last:border-0 bg-card">
                    <div><div className="text-xs font-medium">{l.book_title}</div><div className="text-[10px] text-muted-foreground">{l.student_name} · {l.student_login_id}</div></div>
                    <span className="text-[10px] font-mono text-muted-foreground">{formatISODate(l.borrow_date)}</span>
                  </div>
                ))}
              </div>
            )}
            {pendingReturns.length > 0 && (
              <div className="border border-violet-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-violet-50 border-b border-violet-200 text-xs font-semibold text-violet-800">Return Requests ({pendingReturns.length})</div>
                {pendingReturns.map((l) => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-2.5 border-b border-violet-100 last:border-0 bg-card">
                    <div><div className="text-xs font-medium">{l.book_title}</div><div className="text-[10px] text-muted-foreground">{l.student_name} · {l.student_login_id}</div></div>
                    <span className="text-[10px] font-mono text-muted-foreground">Due {formatISODate(l.due_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
