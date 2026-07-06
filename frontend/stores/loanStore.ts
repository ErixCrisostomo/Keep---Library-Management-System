import { create } from "zustand";
import { Loan } from "@/lib/types";
import { loanService } from "@/services/loanService";
import { useBookStore } from "@/stores/bookStore";

interface LoanState {
  loans: Loan[];
  isLoading: boolean;
  error: string | null;
  fetchLoans: () => Promise<void>;

  // Librarian actions
  checkout: (loginId: string, bookId: string) => Promise<string | null>;
  directReturn: (loanId: string) => Promise<void>;
  approveBorrow: (loanId: string) => Promise<void>;
  rejectBorrow: (loanId: string) => Promise<void>;
  approveReturn: (loanId: string) => Promise<void>;
  rejectReturn: (loanId: string) => Promise<void>;

  // Student actions
  requestBorrow: (bookId: string) => Promise<string | null>;
  requestReturn: (loanId: string) => Promise<void>;
}

/** After any mutation that changes stock, re-sync the book list so availability stays accurate. */
async function refreshBooks() {
  await useBookStore.getState().fetchBooks();
}

export const useLoanStore = create<LoanState>((set, get) => ({
  loans: [],
  isLoading: false,
  error: null,

  fetchLoans: async () => {
    set({ isLoading: true, error: null });
    try {
      const loans = await loanService.list();
      set({ loans, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load loans.", isLoading: false });
    }
  },

  checkout: async (loginId, bookId) => {
    try {
      const loan = await loanService.checkout(loginId, bookId);
      set({ loans: [loan, ...get().loans] });
      await refreshBooks();
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Checkout failed.";
    }
  },

  directReturn: async (loanId) => {
    const loan = await loanService.directReturn(loanId);
    set({ loans: get().loans.map((l) => (l.id === loanId ? loan : l)) });
    await refreshBooks();
  },

  approveBorrow: async (loanId) => {
    const loan = await loanService.approveBorrow(loanId);
    set({ loans: get().loans.map((l) => (l.id === loanId ? loan : l)) });
    await refreshBooks();
  },

  rejectBorrow: async (loanId) => {
    await loanService.rejectBorrow(loanId);
    set({ loans: get().loans.filter((l) => l.id !== loanId) });
  },

  approveReturn: async (loanId) => {
    const loan = await loanService.approveReturn(loanId);
    set({ loans: get().loans.map((l) => (l.id === loanId ? loan : l)) });
    await refreshBooks();
  },

  rejectReturn: async (loanId) => {
    const loan = await loanService.rejectReturn(loanId);
    set({ loans: get().loans.map((l) => (l.id === loanId ? loan : l)) });
  },

  requestBorrow: async (bookId) => {
    try {
      const loan = await loanService.requestBorrow(bookId);
      set({ loans: [loan, ...get().loans] });
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Request failed.";
    }
  },

  requestReturn: async (loanId) => {
    const loan = await loanService.requestReturn(loanId);
    set({ loans: get().loans.map((l) => (l.id === loanId ? loan : l)) });
  },
}));
