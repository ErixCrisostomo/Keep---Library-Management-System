export type Role = "librarian" | "student";
export type LoanStatus = "Requested" | "Active" | "Overdue" | "Return Requested" | "Returned";

export interface AuthUser {
  id: string;
  login_id: string;
  name: string;
  role: Role;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  total: number;
  available: number;
}

export interface BookForm {
  title: string;
  author: string;
  isbn: string;
  genre: string;
  total: string;
}

export interface Loan {
  id: string;
  book_id: string;
  book_title: string;
  author: string;
  student_name: string;
  student_login_id: string;
  borrow_date: string; // ISO date
  due_date: string; // ISO date
  return_date?: string | null;
  status: LoanStatus;
}

export interface ReportSummary {
  total_books_in_inventory: number;
  total_active_checkouts: number;
  total_overdue_books: number;
  overdue_students: {
    student_name: string;
    student_login_id: string;
    book_title: string;
    due_date: string;
    days_overdue: number;
  }[];
}
