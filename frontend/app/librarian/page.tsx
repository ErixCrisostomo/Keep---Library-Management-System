"use client";

import { useState } from "react";
import { BookOpen, ArrowLeftRight, AlertTriangle, BarChart3 } from "lucide-react";
import { useRequireRole } from "@/hooks/useAuth";
import { useBooks } from "@/hooks/useBooks";
import { useLoans } from "@/hooks/useLoans";
import { formatDate } from "@/lib/utils";
import { Header } from "@/components/Header";
import { InventoryTab } from "@/components/InventoryTab";
import { CheckoutTab } from "@/components/CheckoutTab";
import { OverdueTab } from "@/components/OverdueTab";
import { ReportsTab } from "@/components/ReportsTab";

type LibTab = "inventory" | "checkout" | "overdue" | "reports";

export default function LibrarianPage() {
  const { user, ready } = useRequireRole("librarian");
  const { books, addBook, editBook, deleteBook } = useBooks();
  const { loans, checkout, directReturn, approveBorrow, rejectBorrow, approveReturn } = useLoans();
  const [libTab, setLibTab] = useState<LibTab>("inventory");
  const [checkoutMode, setCheckoutMode] = useState<string>("checkout");

  if (!ready || !user) return null;

  const overdueCount = loans.filter((l) => l.status === "Overdue").length;
  const pendingCount = loans.filter((l) => l.status === "Requested" || l.status === "Return Requested").length;

  const libTabs: { id: LibTab; label: string; icon: React.ElementType }[] = [
    { id: "inventory", label: "Inventory Control", icon: BookOpen },
    { id: "checkout", label: "Checkout / Return", icon: ArrowLeftRight },
    { id: "overdue", label: "Overdue", icon: AlertTriangle },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header
        user={user}
        loans={loans}
        onNavigate={(mode) => { setLibTab(mode === "overdue" ? "overdue" : "checkout"); if (mode !== "overdue") setCheckoutMode(mode); }}
      />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6">
        <div className="mb-6">
          <h1 className="font-semibold text-2xl font-serif">Librarian Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDate(new Date())}</p>
        </div>
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {libTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setLibTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${libTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
              <Icon size={14} />{label}
              {id === "overdue" && overdueCount > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-red-100 text-red-700 rounded-full">{overdueCount}</span>}
              {id === "checkout" && pendingCount > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-blue-100 text-blue-700 rounded-full">{pendingCount}</span>}
            </button>
          ))}
        </div>
        {libTab === "inventory" && <InventoryTab books={books} onAdd={addBook} onEdit={editBook} onDelete={deleteBook} />}
        {libTab === "checkout" && (
          <CheckoutTab
            books={books}
            loans={loans}
            onCheckout={checkout}
            onReturn={directReturn}
            onApproveBorrow={approveBorrow}
            onRejectBorrow={rejectBorrow}
            onApproveReturn={approveReturn}
            initialMode={checkoutMode as "checkout" | "return" | "requests" | "borrowed"}
            key={checkoutMode /* remount so initialMode takes effect on notif nav */}
          />
        )}
        {libTab === "overdue" && <OverdueTab loans={loans} />}
        {libTab === "reports" && <ReportsTab books={books} loans={loans} />}
      </main>
      <footer className="border-t border-border py-4 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Keep v1.0</span>
        </div>
      </footer>
    </div>
  );
}
