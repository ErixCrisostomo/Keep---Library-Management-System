"use client";

import { useRequireRole } from "@/hooks/useAuth";
import { useBooks } from "@/hooks/useBooks";
import { useLoans } from "@/hooks/useLoans";
import { useLogs } from "@/hooks/useLogs";
import { useStaff } from "@/hooks/useStaff";
import { Header } from "@/components/Header";
import { SuperAdminDashboard } from "@/components/SuperAdminDashboard";

export default function SuperAdminPage() {
  const { user, ready } = useRequireRole("superadmin");
  const { books } = useBooks();
  const { loans } = useLoans();
  const { logs } = useLogs();
  const { staff } = useStaff();

  if (!ready || !user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header user={user} loans={loans} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6">
        <div className="mb-6">
          <h1 className="font-semibold text-2xl font-serif">Superadmin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Access to staff management and system-wide reporting.</p>
        </div>
        <SuperAdminDashboard staff={staff} books={books} loans={loans} logs={logs} />
      </main>
      <footer className="border-t border-border py-4 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Keep v1.0</span>
        </div>
      </footer>
    </div>
  );
}
