"use client";

import { ShieldCheck, Users, BarChart3, History } from "lucide-react";
import { StaffProfile, Book, Loan, TxLog } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function SuperAdminDashboard({ staff, books, loans, logs }: {
  staff: StaffProfile[];
  books: Book[];
  loans: Loan[];
  logs: TxLog[];
}) {
  const activeLoans = loans.filter((l) => l.status === "Active");
  const overdueLoans = loans.filter((l) => l.status === "Overdue");
  const totalStaff = staff.length;
  const totalBooks = books.length;
  const totalTransactions = logs.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Staff Accounts", value: totalStaff, icon: Users, color: "text-primary" },
          { label: "Book Titles", value: totalBooks, icon: BarChart3, color: "text-emerald-600" },
          { label: "Transactions", value: totalTransactions, icon: History, color: "text-violet-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <div className={`${color} mb-3`}><Icon size={18} /></div>
            <div className="text-3xl font-semibold font-serif">{value}</div>
            <div className="text-sm text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">System Overview</h2>
                <p className="text-xs text-muted-foreground">Live operational snapshot</p>
              </div>
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-background p-4 border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Active Loans</div>
                <div className="text-2xl font-semibold mt-2">{activeLoans.length}</div>
              </div>
              <div className="rounded-2xl bg-background p-4 border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Overdue Loans</div>
                <div className="text-2xl font-semibold mt-2">{overdueLoans.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">Audit Log</h2>
                <p className="text-xs text-muted-foreground">Most recent actions</p>
              </div>
              <History size={18} className="text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {logs.slice(-5).reverse().map((log) => (
                <div key={log.id} className="rounded-2xl border border-border p-3 bg-background">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{log.type.replace(/_/g, " ")}</div>
                      <div className="text-xs text-muted-foreground truncate">{log.book_title} · {log.student_login_id}</div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{formatDate(new Date(log.created_at))}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground flex flex-wrap gap-2">
                    <span>Actor: {log.actor_name}</span>
                    <span>Loan: {log.loan_id ?? "N/A"}</span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <div className="text-sm text-muted-foreground">No audit entries available.</div>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-3xl p-5">
            <h2 className="font-semibold text-lg mb-3">Staff Directory</h2>
            <div className="space-y-3">
              {staff.map((member) => (
                <div key={member.id} className="rounded-2xl border border-border p-4 bg-background">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{member.login_id}</div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-medium capitalize">
                      {member.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2">Role: {member.role}</div>
                </div>
              ))}
              {staff.length === 0 && <div className="text-sm text-muted-foreground">No staff accounts found.</div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
