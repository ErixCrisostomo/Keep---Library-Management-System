"use client";

import { Download, BookOpen, CheckCircle2, BookMarked, AlertTriangle, FileText, TrendingUp } from "lucide-react";
import { Book, Loan } from "@/lib/types";
import { daysOverdue, formatDate, formatISODate } from "@/lib/utils";
import { AvailabilityBar } from "@/components/shared";

export function ReportsTab({ books, loans }: { books: Book[]; loans: Loan[] }) {
  const totalVolumes = books.reduce((s, b) => s + b.total, 0);
  const totalAvailable = books.reduce((s, b) => s + b.available, 0);
  const activeLoans = loans.filter((l) => l.status === "Active");
  const overdueLoans = loans.filter((l) => l.status === "Overdue");

  const exportCSV = () => {
    const headers = ["Loan ID", "Book Title", "Author", "Student", "Student Number", "Due Date", "Days Overdue"];
    const rows = overdueLoans.map((l) => [l.id, l.book_title, l.author, l.student_name, l.student_login_id, l.due_date, `+${daysOverdue(l.due_date)} days`]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keep_overdue_${formatDate(new Date()).replace(/ /g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold">Executive Summary Report</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Generated {formatDate(new Date())} · Real-time data</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-secondary transition-colors">
          <Download size={14} /> Export Overdue CSV
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Volumes", value: totalVolumes, icon: BookOpen, color: "text-primary" },
          { label: "Available Now", value: totalAvailable, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Active Checkouts", value: activeLoans.length, icon: BookMarked, color: "text-amber-600" },
          { label: "Overdue Items", value: overdueLoans.length, icon: AlertTriangle, color: "text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className={`${color} mb-2`}><Icon size={18} /></div>
            <div className="text-2xl font-semibold font-serif">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText size={14} className="text-primary" />Overdue Student Detail ({overdueLoans.length})</h3>
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50 border-b border-red-200">
                {["Loan ID", "Book", "Student", "Student Number", "Due Date", "Days Overdue"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-mono font-medium text-red-700 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overdueLoans.map((loan) => (
                <tr key={loan.id} className="border-b border-red-100 last:border-0 bg-card hover:bg-red-50/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{loan.id}</td>
                  <td className="px-4 py-3"><div className="font-medium">{loan.book_title}</div><div className="text-xs text-muted-foreground">{loan.author}</div></td>
                  <td className="px-4 py-3">{loan.student_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{loan.student_login_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-red-700">{formatISODate(loan.due_date)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono font-medium">+{daysOverdue(loan.due_date)} days</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {overdueLoans.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No overdue items.</div>}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-primary" />Full Inventory Overview</h3>
        <div className="flex flex-col">
          {books.map((book) => (
            <div key={book.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{book.title}</div><div className="text-xs text-muted-foreground">{book.author}</div></div>
              {book.available === 0
                ? <span className="text-xs font-mono text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Out of Stock</span>
                : <AvailabilityBar available={book.available} total={book.total} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
