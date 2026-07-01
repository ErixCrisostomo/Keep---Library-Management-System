"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Loan } from "@/lib/types";
import { daysOverdue, formatDate } from "@/lib/utils";

export function OverdueTab({ loans }: { loans: Loan[] }) {
  const overdueLoans = loans.filter((l) => l.status === "Overdue");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-red-800">Daily Overdue Sweep — {formatDate(new Date())}</div>
          <div className="text-sm text-red-700 mt-0.5">Automated check flagged <span className="font-semibold">{overdueLoans.length} item{overdueLoans.length !== 1 ? "s" : ""}</span> as overdue.</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Flagged Overdue", value: overdueLoans.length, color: "text-red-600" },
          { label: "Unique Students", value: new Set(overdueLoans.map((l) => l.student_login_id)).size, color: "text-amber-600" },
          { label: "Avg Days Overdue", value: overdueLoans.length ? Math.round(overdueLoans.reduce((s, l) => s + daysOverdue(l.due_date), 0) / overdueLoans.length) : 0, color: "text-primary" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-semibold ${color} font-serif`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="border border-red-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-red-50 border-b border-red-200">
              {["Loan ID", "Book Title", "Student", "Student Number", "Due Date", "Days Overdue"].map((h) => (
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
                <td className="px-4 py-3 font-mono text-xs text-red-700">{loan.due_date}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono font-semibold">+{daysOverdue(loan.due_date)} days</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {overdueLoans.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-500" /> No overdue items today.
          </div>
        )}
      </div>
    </div>
  );
}
