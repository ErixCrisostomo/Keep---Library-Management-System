"use client";

import { useRequireRole } from "@/hooks/useAuth";
import { useBooks } from "@/hooks/useBooks";
import { useLoans } from "@/hooks/useLoans";
import { useLogs } from "@/hooks/useLogs";
import { Header } from "@/components/Header";
import { StudentDashboard } from "@/components/StudentDashboard";

export default function StudentPage() {
  const { user, ready } = useRequireRole("student");
  const { books } = useBooks();
  const { loans, requestBorrow, requestReturn } = useLoans();
  const { logs, fetchLogs } = useLogs();

  const handleRequestBorrow = async (bookId: string) => {
    const error = await requestBorrow(bookId);
    if (!error) await fetchLogs();
    return error;
  };

  const handleRequestReturn = async (loanId: string) => {
    await requestReturn(loanId);
    await fetchLogs();
  };

  if (!ready || !user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header user={user} loans={loans} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6">
        <div className="mb-6">
          <h1 className="font-semibold text-2xl font-serif">Welcome back, {user.name.split(" ")[0]}.</h1>
          <p className="text-sm text-muted-foreground mt-1">Student Number: <span className="font-mono">{user.login_id}</span></p>
        </div>
        <StudentDashboard user={user} books={books} loans={loans} logs={logs} onBorrow={handleRequestBorrow} onRequestReturn={handleRequestReturn} />
      </main>
      <footer className="border-t border-border py-4 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Keep v1.0</span>
        </div>
      </footer>
    </div>
  );
}
