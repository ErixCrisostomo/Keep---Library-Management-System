"use client";

import { X, Clock } from "lucide-react";
import { Book, Loan } from "@/lib/types";
import { formatISODate } from "@/lib/utils";
import { AvailabilityBar, StatusBadge } from "@/components/shared";

export function BorrowConfirmModal({
  book, onConfirm, onClose,
}: { book: Book; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Confirm Borrow Request</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"><X size={15} /></button>
        </div>
        <div className="bg-secondary rounded-xl p-3 mb-4">
          <div className="font-medium text-sm">{book.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{book.author}</div>
          <div className="flex items-center gap-2 mt-2">
            <AvailabilityBar available={book.available} total={book.total} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Your request will be sent to the librarian for approval. Once approved, your loan will be marked{" "}
          <span className="font-medium text-foreground">Active</span> with a 14-day due date.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-secondary transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">Submit Request</button>
        </div>
      </div>
    </div>
  );
}

export function ReturnConfirmModal({
  loan, onConfirm, onClose,
}: { loan: Loan; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Request Return</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"><X size={15} /></button>
        </div>
        <div className="bg-secondary rounded-xl p-3 mb-4">
          <div className="font-medium text-sm">{loan.book_title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{loan.author}</div>
          <div className="flex items-center gap-2 mt-2">
            <Clock size={11} className="text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">Due {formatISODate(loan.due_date)}</span>
            <StatusBadge status={loan.status} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Bring the book to the library desk. The librarian will confirm receipt and mark it as{" "}
          <span className="font-medium text-foreground">Returned</span>.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-secondary transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">Confirm Request</button>
        </div>
      </div>
    </div>
  );
}
