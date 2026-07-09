"use client";

import { useState } from "react";
import {
  History, BookMarked, ThumbsUp, ThumbsDown, RefreshCw, CheckCircle2, ArrowLeftRight,
  Plus, Pencil, Trash2, LogIn, LogOut, Package, UserCog, UserPlus, UserMinus
} from "lucide-react";
import { TxLog, TxType } from "@/lib/types";
import { PER_PAGE } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Pager } from "@/components/Pager";

export const TX_COLORS: Record<string, { bg: string; border: string; icon: React.ElementType; iconColor: string; label: string }> = {
  // --- Loan Transactions ---
  request_borrow: { bg: "bg-blue-50", border: "border-blue-200", icon: BookMarked, iconColor: "text-blue-600", label: "Borrow Requested" },
  approve_borrow: { bg: "bg-emerald-50", border: "border-emerald-200", icon: ThumbsUp, iconColor: "text-emerald-600", label: "Borrow Approved" },
  reject_borrow: { bg: "bg-red-50", border: "border-red-200", icon: ThumbsDown, iconColor: "text-red-600", label: "Borrow Rejected" },
  request_return: { bg: "bg-violet-50", border: "border-violet-200", icon: RefreshCw, iconColor: "text-violet-600", label: "Return Requested" },
  reject_return: { bg: "bg-red-50", border: "border-red-200", icon: ThumbsDown, iconColor: "text-red-600", label: "Return Rejected" },
  approve_return: { bg: "bg-teal-50", border: "border-teal-200", icon: CheckCircle2, iconColor: "text-teal-600", label: "Return Confirmed" },
  direct_checkout: { bg: "bg-amber-50", border: "border-amber-200", icon: ArrowLeftRight, iconColor: "text-amber-700", label: "Direct Checkout" },
  direct_return: { bg: "bg-stone-50", border: "border-stone-300", icon: CheckCircle2, iconColor: "text-stone-600", label: "Direct Return" },
  
  // --- Book Management ---
  add_book: { bg: "bg-sky-50", border: "border-sky-200", icon: Plus, iconColor: "text-sky-600", label: "Book Added" },
  update_book: { bg: "bg-orange-50", border: "border-orange-200", icon: Pencil, iconColor: "text-orange-600", label: "Book Updated" },
  delete_book: { bg: "bg-rose-50", border: "border-rose-200", icon: Trash2, iconColor: "text-rose-600", label: "Book Deleted" },
  inventory_change: { bg: "bg-indigo-50", border: "border-indigo-200", icon: Package, iconColor: "text-indigo-600", label: "Inventory Change" },

  // --- Auth & Accounts ---
  login: { bg: "bg-gray-50", border: "border-gray-200", icon: LogIn, iconColor: "text-gray-600", label: "Login" },
  logout: { bg: "bg-gray-50", border: "border-gray-200", icon: LogOut, iconColor: "text-gray-600", label: "Logout" },
  create_account: { bg: "bg-lime-50", border: "border-lime-200", icon: UserPlus, iconColor: "text-lime-700", label: "Account Created" },
  update_account: { bg: "bg-yellow-50", border: "border-yellow-200", icon: UserCog, iconColor: "text-yellow-700", label: "Account Updated" },
  delete_account: { bg: "bg-pink-50", border: "border-pink-200", icon: UserMinus, iconColor: "text-pink-600", label: "Account Deleted" },
};

interface HistoryTabProps {
  logs: TxLog[];
  showStudentInfo?: boolean;
  role?: "librarian" | "superadmin"; // New prop to control visibility
}

export function HistoryTab({ logs, showStudentInfo = true, role = "superadmin" }: HistoryTabProps) {
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [q, setQ] = useState("");

  // 1. Security: Types that Librarians are strictly forbidden from seeing
  const LIBRARIAN_HIDDEN_TYPES = ["login", "logout", "create_account", "update_account", "delete_account"];
  const roleFilteredLogs = role === "librarian" 
    ? logs.filter(l => !LIBRARIAN_HIDDEN_TYPES.includes(l.type))
    : logs;

  // 2. Helper to resolve category ID to actual TxTypes
  const getCategoryTypes = (id: string): TxType[] | null => {
    switch (id) {
      case "all": return null;
      case "all_borrows": return ["request_borrow", "approve_borrow", "reject_borrow", "direct_checkout"];
      case "borrow_requested": return ["request_borrow"];
      case "borrow_approved": return ["approve_borrow", "direct_checkout"];
      case "borrow_rejected": return ["reject_borrow"];
      
      case "all_returns": return ["request_return", "approve_return", "reject_return", "direct_return"];
      case "return_requested": return ["request_return"];
      case "return_approved": return ["approve_return", "direct_return"];
      case "return_rejected": return ["reject_return"];
      
      case "all_books": return ["add_book", "update_book", "delete_book", "inventory_change"];
      case "book_addded": return ["add_book"];
      case "book_updated": return ["update_book"];
      case "book_deleted": return ["delete_book"];
      
      case "all_auth": return ["login", "logout"];
      case "all_accounts": return ["create_account", "update_account", "delete_account"];
      default: return null;
    }
  };

  const activeTypes = getCategoryTypes(selectedCategory) || [];


  const filteredByType = activeTypes.length > 0 
    ? roleFilteredLogs.filter((l) => activeTypes.includes(l.type)) 
    : roleFilteredLogs;

  const qNorm = q.trim().toLowerCase();
  const matchesQuery = (l: TxLog) => {
    if (!qNorm) return true;
    const created = String(l.created_at).toLowerCase();
    if (created.includes(qNorm)) return true;
    if ((l.book_title || "").toLowerCase().includes(qNorm)) return true;
    if ((l.author || "").toLowerCase().includes(qNorm)) return true;
    if ((l.actor_name || "").toLowerCase().includes(qNorm)) return true;
    if ((l.student_name || "").toLowerCase().includes(qNorm)) return true;
    if ((l.student_login_id || "").toLowerCase().includes(qNorm)) return true;
    if ((l.loan_id || "").toLowerCase().includes(qNorm)) return true;
    const label = (TX_COLORS[l.type]?.label || l.type).toLowerCase();
    if (label.includes(qNorm)) return true;
    return false;
  };

  const filtered = filteredByType.filter(matchesQuery);

  const sorted = [...filtered].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return sortOrder === "latest" ? tb - ta : ta - tb;
  });

  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2"><History size={16} className="text-primary" />Transaction Log</h2>
        <span className="text-xs font-mono text-muted-foreground">{roleFilteredLogs.length} transaction{roleFilteredLogs.length !== 1 ? "s" : ""}</span>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-2 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-3 flex-1">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search date, time, title, author, type..."
            className="w-full md:w-72 px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground"
          />
          
          {/* Grouped Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="text-sm px-3 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground"
          >
            <option value="all">All Transactions</option>
            
            <optgroup label="Borrows">
              <option value="all_borrows">All Borrows</option>
              <option value="borrow_requested">Requested</option>
              <option value="borrow_approved">Approved</option>
              <option value="borrow_rejected">Rejected</option>
            </optgroup>

            <optgroup label="Returns">
              <option value="all_returns">All Returns</option>
              <option value="return_requested">Requested</option>
              <option value="return_approved">Approved</option>
              <option value="return_rejected">Rejected</option>
            </optgroup>

            <optgroup label="Books">
              <option value="all_books">All Book Management</option>
              <option value="book_addded">Added</option>
              <option value="book_updated">Updated</option>
              <option value="book_deleted">Deleted</option>            
            </optgroup>

            {role === "superadmin" && (
              <optgroup label="System Administration">
                <option value="all_auth">All Auth & Sessions</option>
                <option value="all_accounts">All Account Management</option>
              </optgroup>
            )}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Sort:</label>
          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value as "latest" | "oldest"); setPage(1); }}
            className="text-xs px-2.5 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {roleFilteredLogs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No transactions recorded yet.</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No transactions match your filters.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {paged.map((log) => {
            const cfg = TX_COLORS[log.type] || { bg: "bg-gray-50", border: "border-gray-200", icon: History, iconColor: "text-gray-600", label: log.type };
            const Icon = cfg.icon;
            
            return (
              <div key={log.id} className={`flex flex-col gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full bg-white/70 flex items-center justify-center shrink-0 mt-0.5 border ${cfg.border}`}>
                    <Icon size={14} className={cfg.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0 grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{cfg.label}</div>
                      <div className="text-sm text-foreground mt-1 truncate">
                        <span className="font-medium">&quot;{log.book_title}&quot;</span>
                        <span className="text-muted-foreground"> by {log.author}</span>
                      </div>
                      
                      {showStudentInfo && log.student_name && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          Student: <span className="font-medium">{log.student_name}</span> · <span className="font-mono">{log.student_login_id}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-start gap-1 text-left md:items-end md:text-right">
                      {log.loan_id && <span className="text-[10px] font-mono text-muted-foreground bg-white/60 px-1.5 py-0.5 rounded">{log.loan_id}</span>}
                      <span className="text-[10px] font-mono text-muted-foreground">{formatDateTime(String(log.created_at))}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">by {log.actor_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <Pager page={page} total={sorted.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      )}
    </div>
  );
}