"use client";

/**
 * SuperAdminDashboard
 *
 * This component renders the Super Admin console including:
 * - Dashboard cards (global stats)
 * - Audit Log table with search, filters, CSV export and pagination
 * - Combined Users & Accounts view
 */
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, BarChart3, History, Download, Search, Lock, AlertTriangle, Pencil, Trash2, UserPlus } from "lucide-react";
import { Pager } from "@/components/Pager";
import { TX_COLORS } from "./HistoryTab";
import { AccountModal } from "@/components/AccountModal";
import { StaffProfile, Book, Loan, TxLog, StudentProfile } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useStudents } from "@/hooks/useStudents";
import { api, ApiError } from "@/services/api";
import { ConfirmModal } from "@/components/ConfirmModal";



// --- DYNAMIC LOG HELPERS ---
// These functions automatically figure out what to display based on the log data,
// meaning you never have to hardcode columns like "Book Title" or "Student" again.

function getTargetLabel(log: TxLog): string {
  if (log.book_title) return `"${log.book_title}"`;
  if (log.student_name && !log.book_title) return `${log.student_name}`;
  if (log.details?.target_type) return `${log.details.target_type}: ${log.details.target_name || log.details.target_id || ""}`;
  return "System";
}

function getContextDetails(log: TxLog): string {
  const parts: string[] = [];

  // 1. Handle Book + Student combinations (Loans)
  if (log.student_name && log.book_title) {
    parts.push(`Student: ${log.student_name} (${log.student_login_id || "N/A"})`);
  } else if (log.student_name && !log.book_title) {
    parts.push(`ID: ${log.student_login_id || "N/A"}`);
  }

  // 2. Handle specific field changes for updates
  if (log.type.includes("update") && log.before_data && log.after_data) {
    const changes: string[] = [];
    for (const key in log.before_data) {
      if (log.before_data[key] !== log.after_data[key]) {
        // Don't show ID changes to keep it concise
        if (key === "id") continue; 
        changes.push(`${key}: "${log.before_data[key]}" → "${log.after_data[key]}"`);
      }
    }
    if (changes.length > 0) {
      parts.push(`Changed: ${changes.join(", ")}`);
    }
  }

  // 3. Handle Deletion context
  if (log.type.includes("delete") && log.before_data) {
    const info = Object.entries(log.before_data)
      .filter(([k]) => k !== "id")
      .map(([k, v]) => `${k}: "${v}"`)
      .join(", ");
    if (info) parts.push(`Deleted data: ${info}`);
  }

  // 4. Handle generic details (Reasons, Messages, IPs)
  if (log.details?.reason) parts.push(`Reason: ${log.details.reason}`);
  if (log.details?.message) parts.push(`Msg: ${log.details.message}`);
  if (log.ip_address) parts.push(`IP: ${log.ip_address}`);

  return parts.length > 0 ? parts.join(" | ") : "—";
}


export function SuperAdminDashboard({ staff, books, loans, logs }: {
  staff: StaffProfile[];
  books: Book[];
  loans: Loan[];
  logs: TxLog[];
}) {
  const { students: initialStudents } = useStudents();
  const [localStaff, setLocalStaff] = useState(staff);
  const [localStudents, setLocalStudents] = useState(initialStudents);
  
  // Keep local state in sync when initial data finishes loading
  useEffect(() => { setLocalStaff(staff); }, [staff]);
  useEffect(() => { setLocalStudents(initialStudents); }, [initialStudents]);

  const [tab, setTab] = useState<"dashboard" | "audit" | "accounts">("dashboard");


  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create_student" | "create_staff" | "edit">("create_student");
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshAccounts = async () => {
    try {
      const [fetchedStaff, fetchedStudents] = await Promise.all([
        api.get<StaffProfile[]>('/api/staff'),
        api.get<StudentProfile[]>('/api/students')
      ]);
      setLocalStaff(fetchedStaff);
      setLocalStudents(fetchedStudents);
    } catch (err) { console.error(err); }
  };

  const requestDelete = (account: any) => {
    setDeleteTarget({ id: account.id, name: account.name });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const isStaff = deleteTarget.id.startsWith("staff-");
    const realId = deleteTarget.id.replace("staff-", "").replace("student-", "");
    const path = isStaff ? `/api/staff/${realId}` : `/api/students/${realId}`;
    
    try {
      await api.delete(path);
      setDeleteTarget(null); // Close modal on success
      await refreshAccounts();
    } catch (err) {
      if (err instanceof ApiError) alert(`Delete failed: ${err.message}`);
      else alert("An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  const activeLoans = loans.filter((l) => l.status === "Active");
  const overdueLoans = loans.filter((l) => l.status === "Overdue");
  const totalStaff = staff.length;
  const totalBooks = books.length;
  const totalTransactions = logs.length;

  // Audit log UI state
  const [auditQuery, setAuditQuery] = useState("");
  const [auditType, setAuditType] = useState<string>("all");
  const [auditPage, setAuditPage] = useState(1);
  const [auditSort, setAuditSort] = useState<"latest" | "oldest">("latest");
  const perPage = 20;

  const auditTypes = useMemo(() => {
    const types = Array.from(new Set(logs.map((l) => l.type)));
    return types.sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let out = logs.slice();
    if (auditType !== "all") out = out.filter((l) => l.type === auditType);
    if (auditQuery.trim()) {
      const q = auditQuery.toLowerCase();
      out = out.filter((l) =>
        (l.book_title || "").toLowerCase().includes(q) ||
        (l.student_login_id || "").toLowerCase().includes(q) ||
        (l.actor_name || "").toLowerCase().includes(q) ||
        (l.type || "").toLowerCase().includes(q) ||
        (l.details?.message || "").toLowerCase().includes(q) // Future proofed for error logs
      );
    }
    out.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return auditSort === "latest" ? timeB - timeA : timeA - timeB;
    });
    return out;
  }, [logs, auditQuery, auditType, auditSort]);

  const auditPageCount = Math.max(1, Math.ceil(filteredLogs.length / perPage));
  const auditPageItems = filteredLogs.slice((auditPage - 1) * perPage, auditPage * perPage);

  function downloadCsv(items: TxLog[]) {
    if (!items.length) return;
    // UPDATED: Added actor, details, before/after to CSV export
    const headers = ["id", "created_at", "actor_name", "type", "target", "context_details", "ip_address"];
    const rows = items.map((r) => {
      const target = r.book_title || r.student_name || (r.details?.target_type || "System");
      const context = getContextDetails(r);
      return [
        r.id,
        new Date(r.created_at).toISOString(),
        r.actor_name,
        r.type,
        target,
        `"${context.replace(/"/g, '""')}"`, // Escape quotes for CSV
        r.ip_address || ""
      ].join(",");
    });
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
    const staffRows = localStaff.map((s) => ({ ...s, id: `staff-${s.id}`, type: s.role || "staff" }));
    const studentRows = localStudents.map((s: StudentProfile) => ({ ...s, id: `student-${s.id}`, type: "student" }));
    return [...staffRows, ...studentRows].sort((a, b) => a.name.localeCompare(b.name));
  }, [localStaff, localStudents]);

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
          <button onClick={() => setTab("dashboard")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === "dashboard" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <Users size={14} /> Dashboard
          </button>
          <button onClick={() => setTab("audit")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === "audit" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <History size={14} /> Audit Log
          </button>
          <button onClick={() => setTab("accounts")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === "accounts" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <ShieldCheck size={14} /> Users & Accounts
          </button>
        </div>
      </div>

      {tab === "dashboard" && (
        <div className="space-y-6">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Book Titles", value: totalBooks, meta: "volumes total", icon: BarChart3 },
                { label: "Available Copies", value: books.reduce((s, b) => s + b.available, 0), meta: "checked out", icon: ShieldCheck },
                { label: "Active Loans", value: activeLoans.length, meta: `${overdueLoans.length} overdue`, icon: History },
                { label: "Pending Requests", value: 0, meta: "Awaiting action", icon: Search },
                { label: "Registered Students", value: localStudents.length, meta: "Active accounts", icon: Users },
                { label: "Out-of-Stock Titles", value: books.filter(b => b.available === 0).length, meta: "Need restocking", icon: AlertTriangle },
                { label: "Total Transactions", value: totalTransactions, meta: "All time", icon: BarChart3 },
                { label: "System Accounts", value: localStaff.length, meta: `${localStaff.filter(s=>s.role==='librarian').length} librarians · ${localStudents.length} students`, icon: ShieldCheck },
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
              <input value={auditQuery} onChange={(e) => { setAuditQuery(e.target.value); setAuditPage(1); }} placeholder="Search by actor, target, changes, or type..." className="w-full pl-12 pr-3 py-3 text-sm bg-input-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground" />
            </div>
            <select value={auditType} onChange={(e) => { setAuditType(e.target.value); setAuditPage(1); }} className="text-sm px-3 py-2 bg-input-background border border-border rounded-lg text-foreground">
              <option value="all">All Types</option>
              {auditTypes.map((t) => <option key={t} value={t}>{(t || "").replace(/_/g, " ")}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Sort:</label>
                <select value={auditSort} onChange={(e) => { setAuditSort(e.target.value as "latest" | "oldest"); setAuditPage(1); }} className="text-xs px-2.5 py-1.5 bg-input-background border border-border rounded-lg text-foreground">
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
              <div className="text-sm text-muted-foreground">{filteredLogs.length} record{filteredLogs.length !== 1 ? "s" : ""}</div>
              <button className="px-3 py-2.5 text-sm rounded-md bg-secondary border border-border text-foreground inline-flex items-center" onClick={() => downloadCsv(filteredLogs)}><Download size={14} className="mr-2"/>Export CSV</button>
            </div>
          </div>

          {/* --- NEW FLEXIBLE AUDIT TABLE --- */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-muted-foreground text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 w-[180px]">When & Who</th>
                    <th className="text-left px-4 py-3 w-[160px]">Event</th>
                    <th className="text-left px-4 py-3 w-[220px]">Target</th>
                    <th className="text-left px-4 py-3">Context & Details</th>
                    <th className="text-right px-4 py-3 w-[80px]">Log ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditPageItems.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-sm text-center text-muted-foreground">No audit entries match your criteria.</td></tr>
                  ) : auditPageItems.map((log) => {
                    const cfg = TX_COLORS[log.type] || { bg: "bg-gray-50", border: "border-gray-200", icon: History, iconColor: "text-gray-600", label: log.type };
                    const Icon = cfg.icon;
                    const target = getTargetLabel(log);
                    const context = getContextDetails(log);
                    
                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        
                        {/* WHEN & WHO */}
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono text-foreground whitespace-nowrap">{formatDate(new Date(log.created_at))}</div>
                          <div className="text-muted-foreground mt-1 truncate text-[11px]">
                            {log.actor_name || "System"}
                          </div>
                        </td>

                        {/* EVENT TYPE (Compact Badge) */}
                        <td className="px-4 py-3 align-top">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${cfg.bg} ${cfg.border}`}>
                            <Icon size={12} className={cfg.iconColor} />
                            {cfg.label}
                          </div>
                          {log.loan_id && (
                            <div className="text-[10px] font-mono text-muted-foreground mt-1">Loan: {log.loan_id}</div>
                          )}
                        </td>

                        {/* TARGET (Dynamic) */}
                        <td className="px-4 py-3 align-top text-foreground font-medium truncate">
                          {target}
                        </td>

                        {/* CONTEXT & DETAILS (Dynamic) */}
                        <td className="px-4 py-3 align-top text-muted-foreground">
                          <div className="line-clamp-3 whitespace-pre-line text-[11px] leading-relaxed">
                            {context}
                          </div>
                        </td>

                        {/* LOG ID */}
                        <td className="px-4 py-3 align-top text-right font-mono text-muted-foreground text-[11px]">
                          {log.id.split("-")[1]}
                        </td>

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
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">{combinedAccounts.length} accounts</div>
                <button onClick={() => { setModalMode("create_student"); setEditingAccount(null); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                  <UserPlus size={14} /> Add Student
                </button>
                <button onClick={() => { setModalMode("create_staff"); setEditingAccount(null); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted/50">
                  <UserPlus size={14} /> Add Staff
                </button>
              </div>
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
                    <th className="text-left px-4 py-3">EMAIL / ID</th>
                    <th className="text-left px-4 py-3">STATUS</th>
                    <th className="text-right px-4 py-3">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedAccounts.map((a, idx) => (
                    <tr key={a.id} className={`${idx % 2 === 0 ? "" : "bg-card/40"} hover:bg-muted/30 border-b border-border`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground font-medium">{a.name.split(" ")[0].charAt(0)}</div>
                          <div>
                            <div className="font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{a.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium capitalize ${
                          a.type === "superadmin" ? "bg-amber-50 text-amber-700" : 
                          a.type === "librarian" ? "bg-blue-50 text-blue-700" : 
                          "bg-primary/10 text-primary"
                        }`}>{a.type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{a.login_id}</td>
                      <td className="px-4 py-3 text-sm"><span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-[11px] font-medium">Active</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setModalMode("edit"); setEditingAccount(a); setIsModalOpen(true); }} className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Edit Account">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => requestDelete(a)} className="p-1.5 rounded-md border border-border text-destructive hover:bg-destructive/10 transition-colors" title="Delete Account">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone and will log you out if you are deleting your own session.`}
        onConfirm={executeDelete}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        isLoading={isDeleting}
      />
      <AccountModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={refreshAccounts} 
        mode={modalMode}
        editData={editingAccount}
      />
    </div>
  );
}