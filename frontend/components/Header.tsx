"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { AuthUser, Loan } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";
import { NotificationPanel } from "@/components/NotificationPanel";

export function Header({
  user, loans, onNavigate, superAdminBadge,
}: { user: AuthUser; loans: Loan[]; onNavigate?: (mode: string) => void; superAdminBadge?: boolean }) {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);

  const overdueCount = loans.filter((l) => l.status === "Overdue").length;
  const pendingCount = loans.filter((l) => l.status === "Requested" || l.status === "Return Requested").length;
  const myOverdueCount = user.role === "student" ? loans.filter((l) => l.student_login_id === user.login_id && l.status === "Overdue").length : 0;
  const myUpcomingCount = user.role === "student"
    ? loans.filter((l) => {
        const d = Math.floor((new Date(l.due_date).getTime() - Date.now()) / 86400000);
        return l.student_login_id === user.login_id && l.status === "Active" && d >= 0 && d <= 3;
      }).length
    : 0;
  const hasNotif = user.role !== "student" ? overdueCount + pendingCount > 0 : myOverdueCount + myUpcomingCount > 0;

  return (
    <header className="border-b border-border bg-card sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/keep-logo.png" alt="Keep logo" className="w-7 h-7 object-contain" style={{ mixBlendMode: "multiply" }} />
          </div>
          <span className="font-semibold text-lg tracking-tight font-serif">Keep</span>
          <span className="text-xs text-muted-foreground border-l border-border pl-2.5 ml-0.5 font-mono hidden sm:inline">Library Management System</span>
          {superAdminBadge && (
            <span className="text-xs border-l border-border pl-2.5 ml-0.5 font-mono text-muted-foreground hidden sm:inline">Super Admin Console</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setNotifOpen((v) => !v)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors relative">
              <Bell size={15} />
              {hasNotif && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-card" />}
            </button>
            {notifOpen && (
              <NotificationPanel
                user={user}
                loans={loans}
                onClose={() => setNotifOpen(false)}
                onNavigate={(mode) => onNavigate?.(mode)}
              />
            )}
          </div>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className={`${superAdminBadge ? "w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center" : "w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"}`}>
              {superAdminBadge ? <ShieldCheck size={13} className="text-amber-700" /> : <User size={13} className="text-primary" />}
            </div>
            <div className="hidden sm:block text-xs leading-none">
              <div className="font-medium">{user.name}</div>
              <div className="text-muted-foreground mt-0.5 font-mono capitalize">{user.role}</div>
            </div>
            <ChevronDown size={13} className="text-muted-foreground hidden sm:block" />
          </div>
          <button onClick={() => { logout(); router.push("/"); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
