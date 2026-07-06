"use client";

/**
 * SuperAdminDashboard
 *
 * This component renders the Super Admin console including:
 * - Dashboard cards (global stats)
 * - Audit Log table with search, filters, CSV export and pagination
 * - Combined Users & Accounts view
 *
 * Props: `staff`, `books`, `loans`, `logs` are normally provided by the
 * container page which fetches them from the API. `logs` is an array of
 * `TxLog` records and is used to populate the Audit Log table.
 */
import { useMemo, useState } from "react";
import { ShieldCheck, Users, BarChart3, History, Download, Search, Lock, AlertTriangle } from "lucide-react";
import { Pager } from "@/components/Pager";
import { TX_COLORS } from "./HistoryTab";
import { StaffProfile, Book, Loan, TxLog, StudentProfile } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStudents } from "@/hooks/useStudents";

export function SuperAdminDashboard({ staff, books, loans, logs }: {
  staff: StaffProfile[];
  books: Book[];
  loans: Loan[];
  logs: TxLog[];
}) {
  /*
   * Note on `logs` handling:
   * - `logs` is expected to be an array of audit records with fields like
   *   id, type, book_title, student_name, student_login_id, actor_name, created_at.
   * - The UI keeps `logs` immutable and derives `auditTypes` / `filteredLogs`
   *   so sorting and pagination happen client-side for small result sets.
   */
  const { students } = useStudents();
  const [tab, setTab] = useState<"dashboard" | "audit" | "accounts">("dashboard");

  const activeLoans = loans.filter((l) => l.status === "Active");
  const overdueLoans = loans.filter((l) => l.status === "Overdue");
  const totalStaff = staff.length;
  const totalBooks = books.length;
  const totalTransactions = logs.length;

  // Audit log UI state
  const [auditQuery, setAuditQuery] = useState("");
  const [auditType, setAuditType] = useState<string>("all");
  const [auditPage, setAuditPage] = useState(1);
  const perPage = 20;

  const auditTypes = useMemo(() => {
    const types = Array.from(new Set(logs.map((l) => l.type)));
    return types.sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let out = logs.slice().reverse();
    if (auditType !== "all") out = out.filter((l) => l.type === auditType);
    if (auditQuery.trim()) {
      const q = auditQuery.toLowerCase();
      out = out.filter((l) =>
        (l.book_title || "").toLowerCase().includes(q) ||
        (l.student_login_id || "").toLowerCase().includes(q) ||
        (l.actor_name || "").toLowerCase().includes(q) ||
        (l.type || "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [logs, auditQuery, auditType]);

  const auditPageCount = Math.max(1, Math.ceil(filteredLogs.length / perPage));
  const auditPageItems = filteredLogs.slice((auditPage - 1) * perPage, auditPage * perPage);

  function downloadCsv(items: TxLog[]) {
    // Client-side CSV export: create a Blob and trigger download.
    // This keeps the UI responsive and avoids server-side CSV generation.
    if (!items.length) return;
    const headers = ["id", "type", "book_title", "student_login_id", "actor_name", "loan_id", "created_at"];
    const rows = items.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","));
    const csv = `${headers.join(",")}\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Users & Accounts combined list
  const combinedAccounts = useMemo(() => {
    // Combine staff and student lists into a single sortable array used
    // by the Accounts table. IDs are namespaced (staff-..., student-...) so
    // the UI can use a single `key` field and still distinguish types.
    const staffRows = staff.map((s) => ({ id: `staff-${s.id}`, name: s.name, login_id: s.login_id, type: s.role || "staff" }));
    const studentRows = students.map((s: StudentProfile) => ({ id: `student-${s.id}`, name: s.name, login_id: s.login_id, type: "student" }));
    return [...staffRows, ...studentRows].sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, students]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-semibold">Super Admin Console</h1>
            <span className="text-xs border-l border-border pl-2.5 ml-0.5 font-mono text-muted-foreground">Privileged</span>
          </div>
        </div>
        <div className="flex gap-1 border-b border-border mt-4 overflow-x-auto">
          <button onClick={() => setTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === "dashboard" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <Users size={14} /> Dashboard
          </button>
          <button onClick={() => setTab("audit")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === "audit" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <History size={14} /> Audit Log
          </button>
          <button onClick={() => setTab("accounts")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === "accounts" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <ShieldCheck size={14} /> Users & Accounts
          </button>
        </div>
      </div>
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* Alert center (prototype-inspired) */}
          <div className="space-y-3">
            <div className="relative w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[0_1fr] items-start bg-card text-card-foreground">
              <div className="col-start-1 pr-3 text-destructive self-start">
                <svg className="size-4" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4" strokeLinecap="round" strokeLinejoin="round"></path><path d="M12 17h.01" strokeLinecap="round" strokeLinejoin="round"></path></svg>
              </div>
              <div className="col-start-2">
                <div className="font-medium text-destructive">__   - 2 Overdue Items — <span className="font-normal text-muted-foreground">Students have unreturned books past their due dates. Librarian follow-up required.</span></div>
              </div>
            </div>

            <div className="relative w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[0_1fr] items-start bg-card text-card-foreground">
              <div className="col-start-1 pr-3 text-muted-foreground self-start">
                <svg className="size-4" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle></svg>
              </div>
              <div className="col-start-2">
                <div className="font-medium">__    - 3 Titles Out of Stock — <span className="font-normal text-muted-foreground">No copies available for borrowing. Consider restocking.</span></div>
              </div>
            </div>
          </div>

          {/* Global statistics grid (prototype style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Book Titles", value: totalBooks, meta: "volumes total", icon: BarChart3 },
                { label: "Available Copies", value: books.reduce((s, b) => s + b.available, 0), meta: "checked out", icon: ShieldCheck },
                { label: "Active Loans", value: activeLoans.length, meta: `${overdueLoans.length} overdue`, icon: History },
                { label: "Pending Requests", value: 0, meta: "Awaiting action", icon: Search },
                { label: "Registered Students", value: students.length, meta: "Active accounts", icon: Users },
                { label: "Out-of-Stock Titles", value: books.filter(b => b.available === 0).length, meta: "Need restocking", icon: AlertTriangle },
                { label: "Total Transactions", value: totalTransactions, meta: "This session", icon: BarChart3 },
                { label: "System Accounts", value: staff.length, meta: "1 librarian · 5 students · 1 admin", icon: ShieldCheck },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                    <div className="text-muted-foreground mb-2"><Icon size={16} /></div>
                    <div className="text-2xl font-semibold font-serif">{card.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{card.label}</div>
                    <div className="text-xs text-muted-foreground mt-2 font-mono">{card.meta}</div>
                  </div>
                );
              })}
          </div>

          {/* System health / monitor placeholder */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm font-medium mb-2">System Health Monitor</div>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>API: <span className="text-foreground font-mono">OK</span></div>
              <div>Database: <span className="text-foreground font-mono">OK</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full">
              <Search size={16} className="absolute left-4 top-3 text-muted-foreground" />
              <input value={auditQuery} onChange={(e) => { setAuditQuery(e.target.value); setAuditPage(1); }} placeholder="Search by book, student, ID, or type..." className="w-full pl-12 pr-3 py-3 text-sm bg-input-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground" />
            </div>
            <select value={auditType} onChange={(e) => { setAuditType(e.target.value); setAuditPage(1); }} className="text-sm px-3 py-2 bg-input-background border border-border rounded-lg text-foreground">
              <option value="all">All Types</option>
              {auditTypes.map((t) => <option key={t} value={t}>{(t || "").replace(/_/g, " ")}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-sm text-muted-foreground">{filteredLogs.length} record{filteredLogs.length !== 1 ? "s" : ""}</div>
              <button className="px-3 py-2.5 text-sm rounded-md bg-secondary border border-border text-foreground inline-flex items-center" onClick={() => downloadCsv(filteredLogs)}><Download size={14} className="mr-2"/>Export CSV</button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-muted-foreground text-[12px]">
                  <tr>
                    <th className="text-left px-4 py-3">LOG ID</th>
                    <th className="text-left px-4 py-3">EVENT TYPE</th>
                    <th className="text-left px-4 py-3">BOOK TITLE</th>
                    <th className="text-left px-4 py-3">STUDENT</th>
                    <th className="text-left px-4 py-3">STUDENT NO.</th>
                    <th className="text-right px-4 py-3">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditPageItems.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-sm text-muted-foreground">No audit entries match your criteria.</td></tr>
                  ) : auditPageItems.map((log, idx) => {
                    const cfg = TX_COLORS[log.type];
                    const Icon = cfg?.icon;
                    const rowBg = idx % 2 === 0 ? "" : "bg-card/40";
                    return (
                      <tr key={log.id} className={`${rowBg} hover:bg-muted/30 border-b border-border`}>
                        <td className="px-4 py-3 align-top font-mono text-[12px]">{log.id}</td>
                        <td className="px-4 py-3 align-top">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border ${cfg?.bg ?? "bg-background"} ${cfg?.border ?? "border-border"}`}>
                            <div className={`w-6 h-6 rounded-full bg-white/60 flex items-center justify-center border ${cfg?.border ?? "border-border"}`}>
                              {Icon && <Icon size={14} className={cfg?.iconColor} />}
                            </div>
                            <div className="text-sm font-medium truncate">{(cfg?.label || log.type).replace(/_/g, " ")}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-muted-foreground">{log.book_title}</td>
                        <td className="px-4 py-3 align-top text-sm">{log.student_name}</td>
                        <td className="px-4 py-3 align-top text-sm font-mono text-muted-foreground">{log.student_login_id}</td>
                        <td className="px-4 py-3 align-top text-right text-[11px] font-mono text-muted-foreground">{formatDate(new Date(log.created_at))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Showing {Math.min(filteredLogs.length, (auditPage-1)*perPage+1)}–{Math.min(filteredLogs.length, auditPage*perPage)} of {filteredLogs.length}</div>
            <Pager page={auditPage} total={filteredLogs.length} perPage={perPage} onChange={setAuditPage} />
          </div>
        </div>
      )}

      {tab === "accounts" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">System Accounts</h2>
              <div className="text-sm text-muted-foreground">{combinedAccounts.length} of {combinedAccounts.length} accounts</div>
            </div>

            <div className="mb-4">
              <div className="relative w-full md:w-96">
                <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
                <input placeholder="Search by name, ID, email, or role..." className="w-full pl-10 pr-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground" />
              </div>
            </div>

            <div className="bg-card border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center"> <ShieldCheck size={20} className="text-amber-600" /> </div>
                <div>
                  <div className="font-medium">System Administrator</div>
                  <div className="text-xs text-muted-foreground font-mono">SA-001 · mainadmin@email.com</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-[11px] font-medium">Super Admin</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-[11px] font-medium">Active</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-muted-foreground text-[12px]">
                  <tr>
                    <th className="text-left px-4 py-3">ACCOUNT</th>
                    <th className="text-left px-4 py-3">ROLE</th>
                    <th className="text-left px-4 py-3">EMAIL</th>
                    <th className="text-left px-4 py-3">STATUS</th>
                    <th className="text-right px-4 py-3">LAST LOGIN</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedAccounts.map((a, idx) => (
                    <tr key={a.id} className={`${idx % 2 === 0 ? "" : "bg-card/40"} hover:bg-muted/30 border-b border-border`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground">{a.name.split(" ")[0].charAt(0)}</div>
                          <div>
                            <div className="font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{a.login_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm"><span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-medium capitalize">{a.type}</span></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{a.login_id.includes("@") ? a.login_id : "—"}</td>
                      <td className="px-4 py-3 text-sm"><span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-[11px] font-medium">Active</span></td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">Jun 28, 2026</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
