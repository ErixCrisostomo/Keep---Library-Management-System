import { api } from "./api";
import { Loan, ReportSummary } from "@/lib/types";

export const loanService = {
  list: () => api.get<Loan[]>("/api/loans"),

  // Librarian: walk-in checkout / direct return
  checkout: (login_id: string, book_id: string) =>
    api.post<Loan>("/api/loans/checkout", { login_id, book_id }),
  directReturn: (loanId: string) => api.post<Loan>(`/api/loans/${loanId}/return`),

  // Student: self-service borrow / return requests
  requestBorrow: (book_id: string) => api.post<Loan>("/api/loans/borrow-request", { book_id }),
  requestReturn: (loanId: string) => api.post<Loan>(`/api/loans/${loanId}/request-return`),

  // Librarian: approve/reject requests
  approveBorrow: (loanId: string) => api.post<Loan>(`/api/loans/${loanId}/approve-borrow`),
  rejectBorrow: (loanId: string) => api.post<void>(`/api/loans/${loanId}/reject-borrow`),
  approveReturn: (loanId: string) => api.post<Loan>(`/api/loans/${loanId}/approve-return`),
  rejectReturn: (loanId: string) => api.post<Loan>(`/api/loans/${loanId}/reject-return`),

  reportSummary: () => api.get<ReportSummary>("/api/reports/summary"),
};
