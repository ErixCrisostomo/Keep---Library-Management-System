import { useState } from "react";
import keepLogo from "../imports/Untitled_design.png";
import {
  BookOpen, Search, BarChart3, ArrowLeftRight, Plus, AlertTriangle,
  Clock, CheckCircle2, XCircle, User, Bell, Eye, EyeOff, Edit2,
  Trash2, RefreshCw, BookMarked, TrendingUp, LogOut, ChevronDown,
  AlertCircle, X, Download, FileText, Library, ThumbsUp, ThumbsDown,
  ChevronRight, ChevronLeft, History, ArrowUpAZ, ArrowDownAZ, Users,
  Shield, Activity, Database, Server, Settings, Radio, Filter,
  UserCheck, Lock, Zap, HardDrive, Wifi, Terminal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "librarian" | "student" | "superadmin";
type LibTab = "inventory" | "checkout" | "overdue" | "reports" | "history" | "students";
type StudentTab = "library" | "loans" | "history";
type LoanStatus = "Requested" | "Active" | "Overdue" | "Return Requested" | "Returned";
type SortOption = "az" | "za" | "avail-desc" | "avail-asc" | "available-only" | "out-of-stock";

interface Book {
  id: string; title: string; author: string; isbn: string;
  total: number; available: number; genre: string;
}
interface Loan {
  id: string; bookId: string; bookTitle: string; author: string;
  borrowDate: string; dueDate: string; returnDate?: string;
  student: string; studentId: string;
  status: "Requested" | "Active" | "Return Requested" | "Returned";
}
interface AuthUser { name: string; id: string; role: Role; }
interface BookForm { title: string; author: string; isbn: string; genre: string; total: string; }
interface AppNotif {
  id: string; forUserId: string;
  type: "borrow_approved" | "borrow_rejected" | "return_confirmed";
  bookTitle: string; timestamp: string;
}
interface TxLog {
  id: string;
  type: "request_borrow" | "approve_borrow" | "reject_borrow" | "request_return" | "approve_return" | "direct_checkout" | "direct_return";
  bookTitle: string; author: string;
  student: string; studentId: string;
  loanId: string; timestamp: string;
}

// ─── Date utilities ───────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};
const TODAY = new Date(2026, 6, 1);

function parseDate(s: string): Date {
  const parts = s.replace(",", "").split(" ");
  return new Date(Number(parts[2]), MONTH_MAP[parts[0]], Number(parts[1]));
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function formatDate(d: Date): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function formatTimestamp(): string {
  const h = TODAY.getHours().toString().padStart(2, "0");
  const m = TODAY.getMinutes().toString().padStart(2, "0");
  // Simulate slightly different times for demo
  const mins = String(Math.floor(Math.random() * 59)).padStart(2, "0");
  return `${formatDate(TODAY)} · ${h}:${mins}`;
}
function daysDiff(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}
function loanStatus(loan: Loan): LoanStatus {
  if (loan.status === "Returned") return "Returned";
  if (loan.status === "Return Requested") return "Return Requested";
  if (loan.status === "Requested") return "Requested";
  if (parseDate(loan.dueDate) < TODAY) return "Overdue";
  return "Active";
}
function daysOverdue(loan: Loan): number {
  return Math.max(0, daysDiff(parseDate(loan.dueDate), TODAY));
}
function daysUntilDue(loan: Loan): number {
  return daysDiff(TODAY, parseDate(loan.dueDate));
}

// ─── Credentials + Registry ───────────────────────────────────────────────────

const CREDENTIALS: Record<string, { password: string; user: AuthUser }> = {
  "juandelacruz@email.com": { password: "lib123", user: { name: "Juan Dela Cruz", id: "LIB-001", role: "librarian" } },
  "22-22222": { password: "student1", user: { name: "Ana Reyes", id: "22-22222", role: "student" } },
  "admin@batstate-u.edu.ph": { password: "Admin@2026!", user: { name: "System Administrator", id: "SA-001", role: "superadmin" } },
};
const STUDENT_REGISTRY: Record<string, string> = {
  "22-22222": "Ana Reyes", "24-00312": "Carlo Dela Cruz",
  "24-00109": "Bea Villanueva", "24-00551": "Miguel Santos", "24-00773": "Jessa Mercado",
};

interface StudentProfile {
  id: string; name: string; section: string; course: string; email: string; yearLevel: string;
}

const STUDENT_PROFILES: StudentProfile[] = [
  { id: "22-22222", name: "Ana Reyes",        section: "BSIT 2201", course: "BS Information Technology", yearLevel: "2nd Year", email: "anareyes@g.batstate-u.edu.ph" },
  { id: "24-00312", name: "Carlo Dela Cruz",  section: "BSIT 2401", course: "BS Information Technology", yearLevel: "1st Year", email: "carlodelacruz@g.batstate-u.edu.ph" },
  { id: "24-00109", name: "Bea Villanueva",   section: "BSCS 2401", course: "BS Computer Science",      yearLevel: "1st Year", email: "beavillanueva@g.batstate-u.edu.ph" },
  { id: "24-00551", name: "Miguel Santos",    section: "BSIT 2402", course: "BS Information Technology", yearLevel: "1st Year", email: "miguelsantos@g.batstate-u.edu.ph" },
  { id: "24-00773", name: "Jessa Mercado",    section: "BSCS 2402", course: "BS Computer Science",      yearLevel: "1st Year", email: "jessamercado@g.batstate-u.edu.ph" },
];

// ─── Initial data ─────────────────────────────────────────────────────────────

const INITIAL_BOOKS: Book[] = [
  { id: "B001", title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "9780743273565", total: 5, available: 3, genre: "Fiction" },
  { id: "B002", title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "9780061935466", total: 4, available: 0, genre: "Fiction" },
  { id: "B003", title: "1984", author: "George Orwell", isbn: "9780451524935", total: 6, available: 2, genre: "Dystopian" },
  { id: "B004", title: "The Catcher in the Rye", author: "J.D. Salinger", isbn: "9780316769174", total: 3, available: 1, genre: "Fiction" },
  { id: "B005", title: "Brave New World", author: "Aldous Huxley", isbn: "9780060850524", total: 4, available: 4, genre: "Dystopian" },
  { id: "B006", title: "Of Mice and Men", author: "John Steinbeck", isbn: "9780140177398", total: 5, available: 2, genre: "Fiction" },
  { id: "B007", title: "Lord of the Flies", author: "William Golding", isbn: "9780399501487", total: 7, available: 5, genre: "Fiction" },
  { id: "B008", title: "The Alchemist", author: "Paulo Coelho", isbn: "9780062315007", total: 3, available: 0, genre: "Philosophy" },
  { id: "B009", title: "Noli Me Tangere", author: "José Rizal", isbn: "9789710801048", total: 8, available: 5, genre: "Fiction" },
  { id: "B010", title: "El Filibusterismo", author: "José Rizal", isbn: "9789710801055", total: 6, available: 3, genre: "Fiction" },
  { id: "B011", title: "Florante at Laura", author: "Francisco Balagtas", isbn: "9789710801062", total: 5, available: 5, genre: "Poetry" },
  { id: "B012", title: "A Brief History of Time", author: "Stephen Hawking", isbn: "9780553380163", total: 4, available: 2, genre: "Science" },
  { id: "B013", title: "Sapiens", author: "Yuval Noah Harari", isbn: "9780062316097", total: 3, available: 1, genre: "History" },
  { id: "B014", title: "The Selfish Gene", author: "Richard Dawkins", isbn: "9780198788607", total: 3, available: 3, genre: "Science" },
  { id: "B015", title: "Introduction to Algorithms", author: "Cormen et al.", isbn: "9780262033848", total: 5, available: 2, genre: "Technology" },
  { id: "B016", title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", total: 4, available: 0, genre: "Technology" },
  { id: "B017", title: "The Art of War", author: "Sun Tzu", isbn: "9781599869773", total: 6, available: 4, genre: "Philosophy" },
  { id: "B018", title: "Meditations", author: "Marcus Aurelius", isbn: "9780812968255", total: 4, available: 2, genre: "Philosophy" },
  { id: "B019", title: "Pride and Prejudice", author: "Jane Austen", isbn: "9780141439518", total: 5, available: 3, genre: "Fiction" },
  { id: "B020", title: "The Republic", author: "Plato", isbn: "9780140455113", total: 4, available: 4, genre: "Philosophy" },
  { id: "B021", title: "Economics in One Lesson", author: "Henry Hazlitt", isbn: "9780517548233", total: 3, available: 1, genre: "Economics" },
  { id: "B022", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", isbn: "9780374533557", total: 3, available: 2, genre: "Psychology" },
  { id: "B023", title: "The Midnight Library", author: "Matt Haig", isbn: "9780525559474", total: 4, available: 3, genre: "Fiction" },
  { id: "B024", title: "Atomic Habits", author: "James Clear", isbn: "9780735211292", total: 5, available: 4, genre: "Psychology" },
];

const INITIAL_LOANS: Loan[] = [
  { id: "L001", bookId: "B002", bookTitle: "To Kill a Mockingbird", author: "Harper Lee", student: "Carlo Dela Cruz", studentId: "24-00312", borrowDate: "Jun 12, 2026", dueDate: "Jun 26, 2026", status: "Active" },
  { id: "L002", bookId: "B008", bookTitle: "The Alchemist", author: "Paulo Coelho", student: "Bea Villanueva", studentId: "24-00109", borrowDate: "Jun 14, 2026", dueDate: "Jun 28, 2026", status: "Active" },
  { id: "L003", bookId: "B003", bookTitle: "1984", author: "George Orwell", student: "Ana Reyes", studentId: "22-22222", borrowDate: "Jun 18, 2026", dueDate: "Jul 02, 2026", status: "Active" },
  { id: "L004", bookId: "B001", bookTitle: "The Great Gatsby", author: "F. Scott Fitzgerald", student: "Miguel Santos", studentId: "24-00551", borrowDate: "Jun 20, 2026", dueDate: "Jul 04, 2026", status: "Active" },
  { id: "L005", bookId: "B004", bookTitle: "The Catcher in the Rye", author: "J.D. Salinger", student: "Jessa Mercado", studentId: "24-00773", borrowDate: "Jun 22, 2026", dueDate: "Jul 06, 2026", status: "Active" },
  { id: "L007", bookId: "B007", bookTitle: "Lord of the Flies", author: "William Golding", student: "Ana Reyes", studentId: "22-22222", borrowDate: "May 30, 2026", dueDate: "Jun 13, 2026", returnDate: "Jun 12, 2026", status: "Returned" },
  { id: "L008", bookId: "B006", bookTitle: "Of Mice and Men", author: "John Steinbeck", student: "Ana Reyes", studentId: "22-22222", borrowDate: "May 10, 2026", dueDate: "May 24, 2026", returnDate: "May 23, 2026", status: "Returned" },
];

// ─── Genre config ─────────────────────────────────────────────────────────────

const GENRES_LIST = ["Fiction","Dystopian","Poetry","Science","History","Technology","Philosophy","Economics","Psychology"];
const ALL_GENRES = ["All", ...GENRES_LIST];

const GENRE_COLORS: Record<string, string> = {
  Fiction:     "bg-amber-100  text-amber-900  border-amber-400",   // harvest gold
  Dystopian:   "bg-stone-200  text-stone-800  border-stone-500",   // weathered driftwood
  Poetry:      "bg-rose-100   text-rose-900   border-rose-400",    // dried rose petal
  Science:     "bg-lime-100   text-lime-900   border-lime-500",    // autumn moss
  History:     "bg-yellow-200 text-yellow-900 border-yellow-500",  // deep ochre
  Technology:  "bg-orange-100 text-orange-900 border-orange-400",  // pumpkin
  Philosophy:  "bg-green-100  text-green-900  border-green-400",   // forest sage
  Economics:   "bg-red-100    text-red-900    border-red-400",     // terracotta clay
  Psychology:  "bg-orange-200 text-orange-950 border-orange-600",  // burnt sienna
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LoanStatus }) {
  const cfg: Record<LoanStatus, string> = {
    Requested: "bg-blue-50 text-blue-700 border border-blue-200",
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Overdue: "bg-red-50 text-red-700 border border-red-200",
    "Return Requested": "bg-violet-50 text-violet-700 border border-violet-200",
    Returned: "bg-stone-100 text-stone-500 border border-stone-200",
  };
  const dot: Record<LoanStatus, React.ReactNode> = {
    Requested: <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />,
    Active: <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />,
    Overdue: <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />,
    "Return Requested": <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />,
    Returned: <CheckCircle2 size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium ${cfg[status]}`}>
      {dot[status]}{status}
    </span>
  );
}

function AvailabilityBar({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? (available / total) * 100 : 0;
  const color = pct === 0 ? "bg-red-400" : pct < 40 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted-foreground">{available}/{total}</span>
    </div>
  );
}

function GenreChip({ genre, small }: { genre: string; small?: boolean }) {
  const cls = GENRE_COLORS[genre] ?? "bg-secondary text-secondary-foreground border-border";
  return (
    <span className={`inline-flex items-center border rounded px-2 py-0.5 font-medium ${small ? "text-[10px]" : "text-xs"} ${cls}`}>
      {genre}
    </span>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-primary text-primary-foreground text-sm rounded-xl shadow-lg flex items-center gap-2">
      <CheckCircle2 size={14} /> {msg}
    </div>
  );
}

// ─── Pager ────────────────────────────────────────────────────────────────────

function Pager({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-xs pt-2">
      <span className="font-mono text-muted-foreground">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onChange(page - 1)}
          className="p-1.5 border border-border rounded-lg hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={13} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
          return (
            <button key={p} onClick={() => onChange(p)}
              className={`w-7 h-7 text-xs border rounded-lg transition-colors ${p === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
              {p}
            </button>
          );
        })}
        <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
          className="p-1.5 border border-border rounded-lg hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Sort + Filter Controls ───────────────────────────────────────────────────

function SortSelect({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as SortOption)}
      className="text-xs px-2.5 py-1.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground">
      <optgroup label="Sort">
        <option value="az">A → Z</option>
        <option value="za">Z → A</option>
        <option value="avail-desc">Most Available</option>
        <option value="avail-asc">Least Available</option>
      </optgroup>
      <optgroup label="Filter by Status">
        <option value="available-only">Available Only</option>
        <option value="out-of-stock">Out of Stock</option>
      </optgroup>
    </select>
  );
}

function applySort(books: Book[], sort: SortOption): Book[] {
  let result = [...books];
  if (sort === "available-only") result = result.filter(b => b.available > 0);
  else if (sort === "out-of-stock") result = result.filter(b => b.available === 0);
  if (sort === "za") return result.sort((a, b) => b.title.localeCompare(a.title));
  if (sort === "avail-desc") return result.sort((a, b) => b.available - a.available);
  if (sort === "avail-asc") return result.sort((a, b) => a.available - b.available);
  return result.sort((a, b) => a.title.localeCompare(b.title));
}

// Keep old name as alias so existing call sites work
function sortBooks(books: Book[], sort: SortOption): Book[] { return applySort(books, sort); }

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({ user, loans, events, onClose, onNavigate }: {
  user: AuthUser; loans: Loan[]; events: AppNotif[];
  onClose: () => void; onNavigate: (tab: LibTab, mode?: string) => void;
}) {
  const myEvents = events.filter(e => e.forUserId === user.id);
  const pendingBorrows = loans.filter(l => l.status === "Requested");
  const pendingReturns = loans.filter(l => l.status === "Return Requested");
  const overdueLoans = loans.filter(l => loanStatus(l) === "Overdue");
  const myOverdue = loans.filter(l => l.studentId === user.id && loanStatus(l) === "Overdue");
  const myUpcoming = loans.filter(l => {
    const d = daysUntilDue(l);
    return l.studentId === user.id && loanStatus(l) === "Active" && d >= 0 && d <= 3;
  });
  const isEmpty = user.role === "librarian"
    ? pendingBorrows.length + pendingReturns.length + overdueLoans.length === 0
    : myEvents.length + myOverdue.length + myUpcoming.length === 0;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-40 overflow-hidden" style={{ maxHeight: 480, overflowY: "auto" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
          <span className="text-sm font-semibold">Notifications</span>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded"><X size={13} /></button>
        </div>
        {isEmpty ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground text-sm gap-2">
            <Bell size={20} className="opacity-30" />No notifications right now.
          </div>
        ) : user.role === "librarian" ? (
          <div className="flex flex-col divide-y divide-border">
            {pendingBorrows.map(loan => (
              <button key={`br-${loan.id}`} onClick={() => { onNavigate("checkout", "requests"); onClose(); }}
                className="flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 group w-full transition-colors">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5"><BookMarked size={13} className="text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">New Borrow Request</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate"><span className="font-medium">{loan.student}</span> requested "{loan.bookTitle}"</div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">{loan.borrowDate}</div>
                </div>
                <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
              </button>
            ))}
            {pendingReturns.map(loan => (
              <button key={`rr-${loan.id}`} onClick={() => { onNavigate("checkout", "requests"); onClose(); }}
                className="flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 group w-full transition-colors">
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5"><RefreshCw size={13} className="text-violet-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">Return Request</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate"><span className="font-medium">{loan.student}</span> is returning "{loan.bookTitle}"</div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">{loan.studentId}</div>
                </div>
                <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
              </button>
            ))}
            {overdueLoans.map(loan => (
              <button key={`ov-${loan.id}`} onClick={() => { onNavigate("overdue"); onClose(); }}
                className="flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 group w-full transition-colors">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><AlertTriangle size={13} className="text-red-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-red-700">Overdue Item</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate"><span className="font-medium">{loan.student}</span> — "{loan.bookTitle}"</div>
                  <div className="text-[10px] font-mono text-red-500 mt-1">+{daysOverdue(loan)} days past due</div>
                </div>
                <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {myEvents.map(ev => {
              const cfg = {
                borrow_approved: { icon: CheckCircle2, bg: "bg-emerald-100", color: "text-emerald-600", label: "Borrow Approved", body: `Your request for "${ev.bookTitle}" was approved. Pick it up at the library.` },
                borrow_rejected: { icon: XCircle, bg: "bg-red-100", color: "text-red-600", label: "Borrow Rejected", body: `Your request for "${ev.bookTitle}" was declined.` },
                return_confirmed: { icon: CheckCircle2, bg: "bg-blue-100", color: "text-blue-600", label: "Return Confirmed", body: `Your return of "${ev.bookTitle}" has been confirmed.` },
              }[ev.type];
              const Icon = cfg.icon;
              return (
                <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={`w-7 h-7 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}><Icon size={13} className={cfg.color} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{cfg.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{cfg.body}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">{ev.timestamp}</div>
                  </div>
                </div>
              );
            })}
            {myOverdue.map(loan => (
              <div key={`ov-${loan.id}`} className="flex items-start gap-3 px-4 py-3 bg-red-50/60">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><AlertCircle size={13} className="text-red-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-red-700">Book Overdue</div>
                  <div className="text-xs text-muted-foreground mt-0.5">"{loan.bookTitle}" was due <span className="font-mono">{loan.dueDate}</span></div>
                  <div className="text-[10px] font-mono text-red-500 mt-1">+{daysOverdue(loan)} days — return immediately</div>
                </div>
              </div>
            ))}
            {myUpcoming.map(loan => (
              <div key={`up-${loan.id}`} className="flex items-start gap-3 px-4 py-3 bg-amber-50/60">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5"><Clock size={13} className="text-amber-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-amber-800">Due Soon</div>
                  <div className="text-xs text-muted-foreground mt-0.5">"{loan.bookTitle}" due <span className="font-mono">{loan.dueDate}</span></div>
                  <div className="text-[10px] font-mono text-amber-600 mt-1">
                    {daysUntilDue(loan) === 0 ? "Due today" : `${daysUntilDue(loan)} day${daysUntilDue(loan) > 1 ? "s" : ""} remaining`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const entry = CREDENTIALS[identifier.trim()];
      if (entry && entry.password === password) onLogin(entry.user);
      else setError("Invalid credentials. Please check your email or Student Number and password.");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 items-center justify-center mb-4">
            <img src={keepLogo} alt="Keep logo" className="w-14 h-14 object-contain" style={{ mixBlendMode: "multiply" }} />
          </div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Keep</h1>
          <p className="text-sm text-muted-foreground mt-1">Library Management System</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Email or Student Number</label>
              <input autoFocus className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="juandelacruz@email.com or 22-22222" value={identifier} onChange={e => setIdentifier(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} className="w-full px-3 py-2.5 pr-10 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {error && <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><XCircle size={13} className="shrink-0 mt-0.5" />{error}</div>}
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
        <div className="mt-4 p-3 bg-muted/60 border border-border rounded-xl text-xs text-muted-foreground">
          <div className="font-medium text-foreground mb-1.5">Demo credentials</div>
          <div className="flex flex-col gap-1 font-mono">
            <div><span className="text-primary">Librarian:</span> juandelacruz@email.com · lib123</div>
            <div><span className="text-primary">Student:</span> 22-22222 · student1</div>
            <div><span className="text-amber-600">Super Admin:</span> admin@batstate-u.edu.ph · Admin@2026!</div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">Session expires after 30 min of inactivity.</p>
      </div>
    </div>
  );
}

// ─── Book Modal ───────────────────────────────────────────────────────────────

const EMPTY_FORM: BookForm = { title: "", author: "", isbn: "", genre: "Fiction", total: "" };
const TITLE_MAX = 100; const AUTHOR_MAX = 80;
function validateISBN(isbn: string) { const c = isbn.replace(/[-\s]/g, ""); return c.length === 10 || c.length === 13; }

function BookModal({ book, onClose, onSave }: { book: Book | null; onClose: () => void; onSave: (f: BookForm) => void }) {
  const [form, setForm] = useState<BookForm>(
    book ? { title: book.title, author: book.author, isbn: book.isbn, genre: book.genre, total: String(book.total) } : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof BookForm, string>>>({});
  const set = (k: keyof BookForm, max?: number) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = max ? e.target.value.slice(0, max) : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };
  const validate = () => {
    const e: Partial<Record<keyof BookForm, string>> = {};
    if (!form.title.trim()) e.title = "Title is required.";
    else if (form.title.length > TITLE_MAX) e.title = `Max ${TITLE_MAX} characters.`;
    if (!form.author.trim()) e.author = "Author is required.";
    else if (form.author.length > AUTHOR_MAX) e.author = `Max ${AUTHOR_MAX} characters.`;
    if (!validateISBN(form.isbn)) e.isbn = "Must be a valid 10 or 13-digit ISBN.";
    const n = Number(form.total);
    if (!form.total || isNaN(n) || n < 1 || !Number.isInteger(n)) e.total = "Must be a positive whole number.";
    setErrors(e); return Object.keys(e).length === 0;
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="font-semibold">{book ? "Edit Book" : "Add New Book"}</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"><X size={15} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {(["title", "author"] as const).map(k => (
            <div key={k}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">{k}</label>
                <span className={`text-[10px] font-mono ${form[k].length > (k === "title" ? TITLE_MAX : AUTHOR_MAX) * 0.9 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {form[k].length}/{k === "title" ? TITLE_MAX : AUTHOR_MAX}
                </span>
              </div>
              <input className={`w-full px-3 py-2.5 text-sm bg-input-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 ${errors[k] ? "border-red-400" : "border-border"}`}
                value={form[k]} onChange={set(k, k === "title" ? TITLE_MAX : AUTHOR_MAX)}
                placeholder={k === "title" ? "e.g. Noli Me Tangere" : "e.g. José Rizal"} />
              {errors[k] && <p className="text-xs text-red-600 mt-1">{errors[k]}</p>}
            </div>
          ))}
          <div>
            <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">ISBN (10 or 13 digits)</label>
            <input className={`w-full px-3 py-2.5 text-sm bg-input-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono ${errors.isbn ? "border-red-400" : "border-border"}`}
              value={form.isbn} onChange={set("isbn")} placeholder="e.g. 9789710801048" />
            {errors.isbn && <p className="text-xs text-red-600 mt-1">{errors.isbn}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Genre</label>
              <select className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                value={form.genre} onChange={set("genre")}>
                {GENRES_LIST.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Total Copies</label>
              <input type="number" min={1} max={999}
                className={`w-full px-3 py-2.5 text-sm bg-input-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 ${errors.total ? "border-red-400" : "border-border"}`}
                value={form.total} onChange={set("total")} placeholder="e.g. 4" />
              {errors.total && <p className="text-xs text-red-600 mt-1">{errors.total}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-secondary">Cancel</button>
          <button onClick={() => { if (validate()) onSave(form); }} className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90">
            {book ? "Save Changes" : "Add Book"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

const PER_PAGE = 10;

interface InventoryTabProps { books: Book[]; loans: Loan[]; onAdd: (f: BookForm) => void; onEdit: (id: string, f: BookForm) => void; onDelete: (id: string) => void; }

function InventoryTab({ books, loans, onAdd, onEdit, onDelete }: InventoryTabProps) {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState<SortOption>("az");
  const [page, setPage] = useState(1);
  const [modalBook, setModalBook] = useState<Book | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [blockDelete, setBlockDelete] = useState<Book | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const filtered = sortBooks(books.filter(b => {
    const q = search.toLowerCase();
    return (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.includes(q) || b.id.toLowerCase().includes(q))
      && (genre === "All" || b.genre === genre);
  }), sort);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSave = (form: BookForm) => {
    if (modalBook === "new") { onAdd(form); showToast(`"${form.title}" added to catalog.`); }
    else if (modalBook) { onEdit(modalBook.id, form); showToast(`"${form.title}" updated.`); }
    setModalBook(null);
  };

  const handleDeleteClick = (book: Book) => {
    const hasActive = loans.some(l => l.bookId === book.id && l.status !== "Returned");
    if (hasActive) { setBlockDelete(book); }
    else { setDeleteTarget(book); }
  };

  return (
    <>
      {modalBook !== null && <BookModal book={modalBook === "new" ? null : modalBook} onClose={() => setModalBook(null)} onSave={handleSave} />}

      {/* Block delete — has active loans */}
      {blockDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-amber-300 rounded-2xl w-full max-w-sm shadow-xl p-5">
            <div className="flex gap-3 mb-4">
              <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-foreground mb-1">Cannot Delete Book</h2>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">"{blockDelete.title}"</span> has active or pending loans.
                  All copies must be returned before this book can be removed from the catalog.
                </p>
              </div>
            </div>
            <button onClick={() => setBlockDelete(null)} className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90">Understood</button>
          </div>
        </div>
      )}

      {/* Normal delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5">
            <h2 className="font-semibold mb-1">Delete Book?</h2>
            <p className="text-sm text-muted-foreground mb-4">Remove <span className="font-medium text-foreground">"{deleteTarget.title}"</span> permanently? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-secondary">Cancel</button>
              <button onClick={() => { onDelete(deleteTarget.id); setDeleteTarget(null); showToast(`"${deleteTarget.title}" removed.`); }} className="flex-1 py-2.5 bg-destructive text-destructive-foreground text-sm font-semibold rounded-xl hover:opacity-90">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} />}

      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="w-full pl-9 pr-4 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Search title, author, ISBN…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <SortSelect value={sort} onChange={v => { setSort(v); setPage(1); }} />
          <button onClick={() => setModalBook("new")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
            <Plus size={14} /> Add Book
          </button>
        </div>

        {/* Genre chips */}
        <div className="flex gap-1.5 flex-wrap">
          {ALL_GENRES.map(g => (
            <button key={g} onClick={() => { setGenre(g); setPage(1); }}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${genre === g ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>
              {g}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                {["ID", "Title / Author", "ISBN", "Genre", "Availability", "Actions"].map((h, i) => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider ${i === 2 || i === 3 ? "hidden md:table-cell" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((book, i) => (
                <tr key={book.id} className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{book.id}</td>
                  <td className="px-4 py-3"><div className="font-medium leading-snug">{book.title}</div><div className="text-xs text-muted-foreground mt-0.5">{book.author}</div></td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{book.isbn}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><GenreChip genre={book.genre} small /></td>
                  <td className="px-4 py-3">
                    {book.available === 0
                      ? <span className="text-xs font-mono font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Out of Stock</span>
                      : <AvailabilityBar available={book.available} total={book.total} />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModalBook(book)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"><Edit2 size={13} /></button>
                      <button onClick={() => handleDeleteClick(book)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paged.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No books match your search.</div>}
        </div>
        <Pager page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>
    </>
  );
}

// ─── Checkout / Return / Requests / Borrowed Tab ──────────────────────────────

type CheckoutMode = "checkout" | "return" | "requests" | "borrowed";

interface CheckoutTabProps {
  books: Book[]; loans: Loan[];
  onCheckout: (srCode: string, studentName: string, bookId: string) => string | null;
  onReturn: (loanId: string) => void;
  onApproveBorrow: (loanId: string) => void;
  onRejectBorrow: (loanId: string) => void;
  onApproveReturn: (loanId: string) => void;
  initialMode?: CheckoutMode;
}

function CheckoutTab({ books, loans, onCheckout, onReturn, onApproveBorrow, onRejectBorrow, onApproveReturn, initialMode }: CheckoutTabProps) {
  const [mode, setMode] = useState<CheckoutMode>(initialMode ?? "checkout");
  const [srCode, setSrCode] = useState("");
  const [bookId, setBookId] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [lookedUp, setLookedUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [toast, setToast] = useState("");
  const [borrowedSearch, setBorrowedSearch] = useState("");
  const [borrowedSort, setBorrowedSort] = useState<SortOption>("az");
  const [borrowedPage, setBorrowedPage] = useState(1);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const resolvedName = STUDENT_REGISTRY[srCode.trim()] ?? "";
  const nonReturnedLoans = loans.filter(l => l.status !== "Returned");
  const pendingBorrows = loans.filter(l => l.status === "Requested");
  const pendingReturns = loans.filter(l => l.status === "Return Requested");
  const borrowedLoans = loans.filter(l => l.status === "Active");

  const filteredBorrowed = (() => {
    const q = borrowedSearch.toLowerCase();
    const matched = borrowedLoans.filter(l =>
      !q || l.bookTitle.toLowerCase().includes(q) || l.student.toLowerCase().includes(q) || l.studentId.includes(q) || l.bookId.toLowerCase().includes(q)
    );
    if (borrowedSort === "za") return [...matched].sort((a, b) => b.bookTitle.localeCompare(a.bookTitle));
    if (borrowedSort === "avail-desc") return [...matched].sort((a, b) => (books.find(x => x.id === b.bookId)?.available ?? 0) - (books.find(x => x.id === a.bookId)?.available ?? 0));
    if (borrowedSort === "avail-asc")  return [...matched].sort((a, b) => (books.find(x => x.id === a.bookId)?.available ?? 0) - (books.find(x => x.id === b.bookId)?.available ?? 0));
    return [...matched].sort((a, b) => a.bookTitle.localeCompare(b.bookTitle));
  })();

  const pagedBorrowed = filteredBorrowed.slice((borrowedPage - 1) * PER_PAGE, borrowedPage * PER_PAGE);

  const lookupResults = lookedUp
    ? nonReturnedLoans.filter(l => l.studentId === lookupId.trim() || l.bookId === lookupId.trim().toUpperCase())
    : [];

  const handleCheckout = () => {
    setErrorMsg(""); setSuccessMsg("");
    const name = resolvedName || srCode.trim();
    const err = onCheckout(srCode.trim(), name, bookId.trim().toUpperCase());
    if (err) { setErrorMsg(err); return; }
    const book = books.find(b => b.id === bookId.trim().toUpperCase());
    setSuccessMsg(`"${book?.title}" checked out to ${srCode.trim()}. Due: ${formatDate(addDays(TODAY, 14))}.`);
    setSrCode(""); setBookId("");
  };

  const modes: { id: CheckoutMode; label: string }[] = [
    { id: "checkout", label: "Checkout" },
    { id: "return", label: "Return" },
    { id: "requests", label: `Requests${pendingBorrows.length + pendingReturns.length > 0 ? ` (${pendingBorrows.length + pendingReturns.length})` : ""}` },
    { id: "borrowed", label: `Borrowed (${borrowedLoans.length})` },
  ];

  return (
    <>
      {toast && <Toast msg={toast} />}
      <div className="flex flex-col gap-5">
        <div className="flex rounded-xl border border-border overflow-hidden">
          {modes.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setErrorMsg(""); setSuccessMsg(""); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${mode === m.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
              {m.label}
              {m.id === "requests" && (pendingBorrows.length + pendingReturns.length > 0) && mode !== "requests" && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {mode === "checkout" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Student Number</label>
                <input className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
                  placeholder="e.g. 24-00312" value={srCode} onChange={e => setSrCode(e.target.value)} />
              </div>
              {srCode.trim() && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${resolvedName ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-muted border-border text-muted-foreground"}`}>
                  <User size={13} className="shrink-0" />
                  {resolvedName ? <span><span className="font-medium">{resolvedName}</span> — found in registry</span>
                    : <span className="font-mono text-xs">Not in registry — Student Number used as identifier</span>}
                </div>
              )}
              <div>
                <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Book ID</label>
                <input className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
                  placeholder="e.g. B003" value={bookId} onChange={e => setBookId(e.target.value)} />
              </div>
              {errorMsg && <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><XCircle size={15} className="shrink-0 mt-0.5" />{errorMsg}</div>}
              {successMsg && <div className="flex gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"><CheckCircle2 size={15} className="shrink-0 mt-0.5" />{successMsg}</div>}
              <button onClick={handleCheckout} className="flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90">
                <ArrowLeftRight size={15} /> Process Checkout
              </button>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">All Active &amp; Overdue Loans</div>
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                {nonReturnedLoans.filter(l => l.status === "Active").map(loan => {
                  const st = loanStatus(loan);
                  return (
                    <div key={loan.id} className={`p-3 rounded-xl border ${st === "Overdue" ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium leading-snug">{loan.bookTitle}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{loan.student} · {loan.studentId}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="font-mono text-xs text-muted-foreground">Due {loan.dueDate}</span>
                            <StatusBadge status={st} />
                          </div>
                        </div>
                        {st === "Overdue" && <span className="text-xs font-mono font-medium text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded shrink-0">+{daysOverdue(loan)}d</span>}
                      </div>
                    </div>
                  );
                })}
                {nonReturnedLoans.filter(l => l.status === "Active").length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No active loans.</div>}
              </div>
            </div>
          </div>
        )}

        {mode === "return" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Lookup by Student Number or Book ID</label>
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
                    placeholder="e.g. 24-00312 or B003" value={lookupId}
                    onChange={e => { setLookupId(e.target.value); setLookedUp(false); setSuccessMsg(""); }} />
                  <button onClick={() => { setLookedUp(true); setSuccessMsg(""); }} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">Lookup</button>
                </div>
              </div>
              {successMsg && <div className="flex gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"><CheckCircle2 size={15} className="shrink-0 mt-0.5" />{successMsg}</div>}
              {lookedUp && (
                lookupResults.length === 0
                  ? <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">No active loans found for "{lookupId}".</div>
                  : <div className="flex flex-col gap-2">
                      {lookupResults.map(loan => {
                        const st = loanStatus(loan);
                        return (
                          <div key={loan.id} className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${st === "Overdue" ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                            <div>
                              <div className="text-sm font-medium">{loan.bookTitle}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{loan.student} · Due {loan.dueDate}</div>
                              <div className="mt-1"><StatusBadge status={st} /></div>
                            </div>
                            {loan.status === "Active" && (
                              <button onClick={() => { onReturn(loan.id); setSuccessMsg(`"${loan.bookTitle}" returned. Inventory updated.`); setLookedUp(false); setLookupId(""); }}
                                className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                                Confirm Return
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">Pending Return Requests</div>
              {pendingReturns.length === 0
                ? <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">No pending return requests.</div>
                : <div className="flex flex-col gap-2">
                    {pendingReturns.map(loan => (
                      <div key={loan.id} className="p-3 rounded-xl border border-violet-200 bg-violet-50 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">{loan.bookTitle}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{loan.student} · {loan.studentId}</div>
                          <div className="mt-1"><StatusBadge status="Return Requested" /></div>
                        </div>
                        <button onClick={() => { onApproveReturn(loan.id); showToast(`"${loan.bookTitle}" return approved.`); }}
                          className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                          Approve Return
                        </button>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {mode === "requests" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Borrow Requests ({pendingBorrows.length})</h3>
              {pendingBorrows.length === 0
                ? <div className="text-sm text-muted-foreground text-center py-10 border border-dashed border-border rounded-xl">No pending borrow requests.</div>
                : <div className="flex flex-col gap-2">
                    {pendingBorrows.map(loan => {
                      const book = books.find(b => b.id === loan.bookId);
                      return (
                        <div key={loan.id} className="p-3 rounded-xl border border-blue-200 bg-blue-50">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="text-sm font-medium">{loan.bookTitle}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{loan.student} · <span className="font-mono">{loan.studentId}</span></div>
                              <div className="text-xs text-muted-foreground">{loan.borrowDate}</div>
                            </div>
                            <StatusBadge status="Requested" />
                          </div>
                          {book && book.available === 0 && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded mb-2">⚠ No copies available — cannot approve.</div>}
                          <div className="flex gap-2">
                            <button onClick={() => { onRejectBorrow(loan.id); showToast(`Request for "${loan.bookTitle}" rejected.`); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border border-border text-muted-foreground rounded-lg hover:bg-secondary">
                              <ThumbsDown size={12} /> Reject
                            </button>
                            <button disabled={!book || book.available === 0}
                              onClick={() => { onApproveBorrow(loan.id); showToast(`"${loan.bookTitle}" approved for ${loan.student}.`); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                              <ThumbsUp size={12} /> Approve
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />Return Requests ({pendingReturns.length})</h3>
              {pendingReturns.length === 0
                ? <div className="text-sm text-muted-foreground text-center py-10 border border-dashed border-border rounded-xl">No pending return requests.</div>
                : <div className="flex flex-col gap-2">
                    {pendingReturns.map(loan => (
                      <div key={loan.id} className="p-3 rounded-xl border border-violet-200 bg-violet-50">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm font-medium">{loan.bookTitle}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{loan.student} · <span className="font-mono">{loan.studentId}</span></div>
                          </div>
                          <StatusBadge status="Return Requested" />
                        </div>
                        <button onClick={() => { onApproveReturn(loan.id); showToast(`"${loan.bookTitle}" return approved.`); }}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                          <ThumbsUp size={12} /> Approve Return
                        </button>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {mode === "borrowed" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input className="w-full pl-9 pr-4 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Search by book, student, or Student Number…" value={borrowedSearch}
                  onChange={e => { setBorrowedSearch(e.target.value); setBorrowedPage(1); }} />
              </div>
              <SortSelect value={borrowedSort} onChange={v => { setBorrowedSort(v); setBorrowedPage(1); }} />
            </div>
            <div className="text-xs text-muted-foreground font-mono">{filteredBorrowed.length} of {borrowedLoans.length} active loan{borrowedLoans.length !== 1 ? "s" : ""}</div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    {["Book", "Genre", "Student", "Student No.", "Borrowed", "Due Date", "Status"].map((h, i) => (
                      <th key={h} className={`text-left px-3 py-2.5 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider ${i === 1 || i === 4 ? "hidden md:table-cell" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedBorrowed.map((loan, i) => {
                    const st = loanStatus(loan);
                    const book = books.find(b => b.id === loan.bookId);
                    return (
                      <tr key={loan.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-sm leading-snug">{loan.bookTitle}</div>
                          <div className="text-xs text-muted-foreground">{loan.author}</div>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">{book && <GenreChip genre={book.genre} small />}</td>
                        <td className="px-3 py-2.5 text-sm">{loan.student}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{loan.studentId}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground hidden md:table-cell">{loan.borrowDate}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-mono text-xs ${st === "Overdue" ? "text-red-700 font-semibold" : "text-muted-foreground"}`}>{loan.dueDate}</span>
                          {st === "Overdue" && <div className="text-[10px] text-red-500">+{daysOverdue(loan)}d</div>}
                        </td>
                        <td className="px-3 py-2.5"><StatusBadge status={st} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pagedBorrowed.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">{borrowedLoans.length === 0 ? "No books are currently borrowed." : "No loans match your search."}</div>}
            </div>
            <Pager page={borrowedPage} total={filteredBorrowed.length} perPage={PER_PAGE} onChange={setBorrowedPage} />
          </div>
        )}
      </div>
    </>
  );
}

// ─── Overdue Tab ──────────────────────────────────────────────────────────────

function OverdueTab({ loans }: { loans: Loan[] }) {
  const overdueLoans = loans.filter(l => loanStatus(l) === "Overdue");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-red-800">Daily Overdue Sweep — {formatDate(TODAY)}</div>
          <div className="text-sm text-red-700 mt-0.5">Automated check flagged <span className="font-semibold">{overdueLoans.length} item{overdueLoans.length !== 1 ? "s" : ""}</span> as overdue.</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Flagged Overdue", value: overdueLoans.length, color: "text-red-600" },
          { label: "Unique Students", value: new Set(overdueLoans.map(l => l.studentId)).size, color: "text-amber-600" },
          { label: "Avg Days Overdue", value: overdueLoans.length ? Math.round(overdueLoans.reduce((s, l) => s + daysOverdue(l), 0) / overdueLoans.length) : 0, color: "text-primary" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-semibold ${color}`} style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="border border-red-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-red-50 border-b border-red-200">
              {["Loan ID", "Book Title", "Student", "Student No.", "Due Date", "Days Overdue"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-mono font-medium text-red-700 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {overdueLoans.map(loan => (
              <tr key={loan.id} className="border-b border-red-100 last:border-0 bg-card hover:bg-red-50/40 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{loan.id}</td>
                <td className="px-4 py-3"><div className="font-medium">{loan.bookTitle}</div><div className="text-xs text-muted-foreground">{loan.author}</div></td>
                <td className="px-4 py-3">{loan.student}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{loan.studentId}</td>
                <td className="px-4 py-3 font-mono text-xs text-red-700">{loan.dueDate}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono font-semibold">+{daysOverdue(loan)} days</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {overdueLoans.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2"><CheckCircle2 size={20} className="text-emerald-500" />No overdue items today.</div>}
      </div>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab({ books, loans, logs }: { books: Book[]; loans: Loan[]; logs: TxLog[] }) {
  // ── Derived data ──────────────────────────────────────────────────────────
  const totalVolumes    = books.reduce((s, b) => s + b.total, 0);
  const totalAvailable  = books.reduce((s, b) => s + b.available, 0);
  const totalCheckedOut = totalVolumes - totalAvailable;
  const activeLoans     = loans.filter(l => l.status === "Active");
  const overdueLoans    = loans.filter(l => loanStatus(l) === "Overdue");
  const pendingBorrows  = loans.filter(l => l.status === "Requested");
  const pendingReturns  = loans.filter(l => l.status === "Return Requested");
  const returnedLoans   = loans.filter(l => l.status === "Returned");
  const outOfStock      = books.filter(b => b.available === 0);
  const lowStock        = books.filter(b => b.available > 0 && b.available / b.total < 0.4);
  const utilizationRate = totalVolumes > 0 ? Math.round((totalCheckedOut / totalVolumes) * 100) : 0;

  // Most borrowed books from logs
  const borrowCounts: Record<string, { title: string; author: string; count: number }> = {};
  logs.filter(l => l.type === "approve_borrow" || l.type === "direct_checkout").forEach(l => {
    if (!borrowCounts[l.loanId]) borrowCounts[l.loanId] = { title: l.bookTitle, author: l.author, count: 0 };
  });
  // Count by bookTitle
  const titleCounts: Record<string, { title: string; author: string; count: number }> = {};
  logs.filter(l => l.type === "approve_borrow" || l.type === "direct_checkout").forEach(l => {
    if (!titleCounts[l.bookTitle]) titleCounts[l.bookTitle] = { title: l.bookTitle, author: l.author, count: 0 };
    titleCounts[l.bookTitle].count++;
  });
  const topBooks = Object.values(titleCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  // Genre analytics
  const genreStats = GENRES_LIST.map(g => {
    const genreBooks = books.filter(b => b.genre === g);
    const gTotal = genreBooks.reduce((s, b) => s + b.total, 0);
    const gAvail  = genreBooks.reduce((s, b) => s + b.available, 0);
    const gOut    = gTotal - gAvail;
    const gLoans  = logs.filter(l => {
      const book = books.find(b => b.bookTitle === l.bookTitle || genreBooks.find(gb => gb.title === l.bookTitle));
      return (l.type === "approve_borrow" || l.type === "direct_checkout") && genreBooks.some(gb => gb.title === l.bookTitle);
    }).length;
    return { genre: g, titles: genreBooks.length, volumes: gTotal, available: gAvail, checkedOut: gOut, utilPct: gTotal > 0 ? Math.round((gOut / gTotal) * 100) : 0 };
  }).filter(g => g.titles > 0);

  // Student activity
  const studentActivity = STUDENT_PROFILES.map(s => {
    const sLoans    = loans.filter(l => l.studentId === s.id);
    const sActive   = sLoans.filter(l => l.status === "Active").length;
    const sOverdue  = sLoans.filter(l => loanStatus(l) === "Overdue").length;
    const sReturned = sLoans.filter(l => l.status === "Returned").length;
    const sTx       = logs.filter(l => l.studentId === s.id).length;
    return { ...s, active: sActive, overdue: sOverdue, returned: sReturned, transactions: sTx, total: sActive + sReturned };
  }).filter(s => s.total > 0 || s.transactions > 0).sort((a, b) => b.total - a.total);

  // Export
  const exportReport = () => {
    const sep = (t: string) => ["", `=== ${t} ===`];
    const lines: string[] = [
      "KEEP LIBRARY MANAGEMENT SYSTEM",
      "Batangas State University",
      `Report Generated: ${formatDate(TODAY)}`,
      "",
      ...sep("EXECUTIVE SUMMARY"),
      `Total Book Titles: ${books.length}`,
      `Total Volumes: ${totalVolumes}`,
      `Available Copies: ${totalAvailable}`,
      `Checked Out: ${totalCheckedOut}`,
      `Collection Utilization: ${utilizationRate}%`,
      `Out of Stock Titles: ${outOfStock.length}`,
      `Low Stock Titles: ${lowStock.length}`,
      "",
      ...sep("LOAN STATISTICS"),
      `Active Loans: ${activeLoans.length}`,
      `Overdue Items: ${overdueLoans.length}`,
      `Pending Borrow Requests: ${pendingBorrows.length}`,
      `Pending Return Requests: ${pendingReturns.length}`,
      `Total Returned (all time): ${returnedLoans.length}`,
      `Total Transactions Logged: ${logs.length}`,
      "",
      ...sep("OVERDUE ITEMS"),
      ["Loan ID","Book Title","Student","Student No.","Due Date","Days Overdue"].join(","),
      ...overdueLoans.map(l => [l.id,`"${l.bookTitle}"`,l.student,l.studentId,l.dueDate,`+${daysOverdue(l)} days`].join(",")),
      "",
      ...sep("ACTIVE LOANS"),
      ["Loan ID","Book Title","Student","Student No.","Borrow Date","Due Date"].join(","),
      ...activeLoans.map(l => [l.id,`"${l.bookTitle}"`,l.student,l.studentId,l.borrowDate,l.dueDate].join(",")),
      "",
      ...sep("PENDING BORROW REQUESTS"),
      ["Loan ID","Book Title","Student","Student No.","Requested On"].join(","),
      ...pendingBorrows.map(l => [l.id,`"${l.bookTitle}"`,l.student,l.studentId,l.borrowDate].join(",")),
      "",
      ...sep("GENRE ANALYTICS"),
      ["Genre","Titles","Volumes","Available","Checked Out","Utilization %"].join(","),
      ...genreStats.map(g => [g.genre,g.titles,g.volumes,g.available,g.checkedOut,`${g.utilPct}%`].join(",")),
      "",
      ...sep("TOP BORROWED BOOKS"),
      ["Book Title","Author","Times Borrowed"].join(","),
      ...topBooks.map(b => [`"${b.title}"`,`"${b.author}"`,b.count].join(",")),
      "",
      ...sep("STOCK ALERTS — OUT OF STOCK"),
      ["Book ID","Title","Author","Genre","Total Copies"].join(","),
      ...outOfStock.map(b => [b.id,`"${b.title}"`,`"${b.author}"`,b.genre,b.total].join(",")),
      "",
      ...sep("STUDENT BORROWING ACTIVITY"),
      ["Student No.","Name","Section","Active","Overdue","Returned","Transactions"].join(","),
      ...studentActivity.map(s => [s.id,`"${s.name}"`,s.section,s.active,s.overdue,s.returned,s.transactions].join(",")),
      "",
      ...sep("FULL TRANSACTION LOG"),
      ["Log ID","Type","Book Title","Student","Student No.","Timestamp"].join(","),
      ...[...logs].reverse().map(l => [l.id,l.type,`"${l.bookTitle}"`,l.student,l.studentId,`"${l.timestamp}"`].join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `keep_report_${formatDate(TODAY).replace(/ /g,"_").replace(",","")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-lg" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Library Report</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Generated {formatDate(TODAY)} · Live data</p>
        </div>
        <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-secondary transition-colors">
          <Download size={14} /> Export Full Report
        </button>
      </div>

      {/* ── Section 1: Key Metrics ── */}
      <section>
        <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Executive Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Volumes",       value: totalVolumes,          icon: BookOpen,      color: "text-primary",      sub: `${books.length} titles` },
            { label: "Available Now",        value: totalAvailable,        icon: CheckCircle2,  color: "text-emerald-600",  sub: `${100 - utilizationRate}% of collection` },
            { label: "Checked Out",          value: totalCheckedOut,       icon: BookMarked,    color: "text-amber-600",    sub: `${utilizationRate}% utilization` },
            { label: "Overdue Items",        value: overdueLoans.length,   icon: AlertTriangle, color: "text-red-600",      sub: overdueLoans.length > 0 ? "Needs attention" : "All clear" },
            { label: "Active Loans",         value: activeLoans.length,    icon: ArrowLeftRight,color: "text-primary",      sub: "Currently borrowed" },
            { label: "Pending Requests",     value: pendingBorrows.length + pendingReturns.length, icon: Bell, color: "text-blue-600", sub: `${pendingBorrows.length} borrow · ${pendingReturns.length} return` },
            { label: "Total Returned",       value: returnedLoans.length,  icon: RefreshCw,     color: "text-stone-500",    sub: "All time" },
            { label: "Transactions Logged",  value: logs.length,           icon: History,       color: "text-violet-600",   sub: "This session" },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3.5">
              <div className={`${color} mb-1.5`}><Icon size={15} /></div>
              <div className="text-xl font-semibold" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Stock Alerts ── */}
      <section>
        <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Stock Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Out of stock */}
          <div className="border border-red-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200">
              <XCircle size={13} className="text-red-600" />
              <span className="text-xs font-semibold text-red-800">Out of Stock ({outOfStock.length})</span>
            </div>
            {outOfStock.length === 0
              ? <div className="text-center py-6 text-muted-foreground text-xs">All titles have available copies.</div>
              : <div className="divide-y divide-red-100">
                  {outOfStock.map(b => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2.5 bg-card hover:bg-red-50/30 transition-colors gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium leading-snug truncate">{b.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{b.author}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <GenreChip genre={b.genre} small />
                        <span className="text-xs font-mono text-red-600">0 / {b.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
          {/* Low stock */}
          <div className="border border-amber-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
              <AlertTriangle size={13} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">Low Stock — &lt;40% Available ({lowStock.length})</span>
            </div>
            {lowStock.length === 0
              ? <div className="text-center py-6 text-muted-foreground text-xs">No low-stock titles.</div>
              : <div className="divide-y divide-amber-100">
                  {lowStock.map(b => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2.5 bg-card hover:bg-amber-50/30 transition-colors gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium leading-snug truncate">{b.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{b.author}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <GenreChip genre={b.genre} small />
                        <AvailabilityBar available={b.available} total={b.total} />
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </section>

      {/* ── Section 3: Active Loans ── */}
      <section>
        <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Active Loans ({activeLoans.length + overdueLoans.length})</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                {["Loan ID","Book","Student","Student No.","Borrowed","Due Date","Status"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...overdueLoans, ...activeLoans.filter(l => loanStatus(l) !== "Overdue")].map((loan, i) => {
                const st = loanStatus(loan);
                return (
                  <tr key={loan.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${st === "Overdue" ? "bg-red-50/40" : i % 2 === 1 ? "bg-card/40" : ""}`}>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{loan.id}</td>
                    <td className="px-3 py-2"><div className="text-sm font-medium leading-snug">{loan.bookTitle}</div><div className="text-xs text-muted-foreground">{loan.author}</div></td>
                    <td className="px-3 py-2 text-sm">{loan.student}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{loan.studentId}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{loan.borrowDate}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span className={st === "Overdue" ? "text-red-700 font-semibold" : "text-muted-foreground"}>{loan.dueDate}</span>
                      {st === "Overdue" && <div className="text-[10px] text-red-500">+{daysOverdue(loan)} days</div>}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={st} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activeLoans.length + overdueLoans.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No active loans.</div>}
        </div>
      </section>

      {/* ── Section 4: Top Borrowed + Student Activity side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top borrowed */}
        <section>
          <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Most Borrowed Books</h3>
          {topBooks.length === 0
            ? <div className="border border-dashed border-border rounded-xl text-center py-8 text-muted-foreground text-sm">No borrow transactions yet.</div>
            : <div className="border border-border rounded-xl overflow-hidden">
                {topBooks.map((b, i) => (
                  <div key={b.title} className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                    <span className="text-xs font-mono font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{b.title}</div>
                      <div className="text-xs text-muted-foreground">{b.author}</div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-primary shrink-0">{b.count}×</span>
                  </div>
                ))}
              </div>
          }
        </section>

        {/* Student activity */}
        <section>
          <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Student Borrowing Activity</h3>
          {studentActivity.length === 0
            ? <div className="border border-dashed border-border rounded-xl text-center py-8 text-muted-foreground text-sm">No student activity yet.</div>
            : <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary border-b border-border">
                      {["Student","Active","Overdue","Returned","Tx"].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentActivity.map((s, i) => (
                      <tr key={s.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                        <td className="px-3 py-2">
                          <div className="font-medium leading-snug">{s.name}</div>
                          <div className="font-mono text-muted-foreground text-[10px]">{s.id}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-emerald-700">{s.active}</td>
                        <td className="px-3 py-2 font-mono">{s.overdue > 0 ? <span className="text-red-600 font-semibold">{s.overdue}</span> : <span className="text-muted-foreground">0</span>}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{s.returned}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{s.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </section>
      </div>

      {/* ── Section 6: Pending Requests ── */}
      {(pendingBorrows.length + pendingReturns.length) > 0 && (
        <section>
          <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending Requests ({pendingBorrows.length + pendingReturns.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBorrows.length > 0 && (
              <div className="border border-blue-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs font-semibold text-blue-800">Borrow Requests ({pendingBorrows.length})</div>
                {pendingBorrows.map(l => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100 last:border-0 bg-card">
                    <div><div className="text-xs font-medium">{l.bookTitle}</div><div className="text-[10px] text-muted-foreground">{l.student} · {l.studentId}</div></div>
                    <span className="text-[10px] font-mono text-muted-foreground">{l.borrowDate}</span>
                  </div>
                ))}
              </div>
            )}
            {pendingReturns.length > 0 && (
              <div className="border border-violet-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-violet-50 border-b border-violet-200 text-xs font-semibold text-violet-800">Return Requests ({pendingReturns.length})</div>
                {pendingReturns.map(l => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-2.5 border-b border-violet-100 last:border-0 bg-card">
                    <div><div className="text-xs font-medium">{l.bookTitle}</div><div className="text-[10px] text-muted-foreground">{l.student} · {l.studentId}</div></div>
                    <span className="text-[10px] font-mono text-muted-foreground">Due {l.dueDate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Transaction History Tab (Librarian) ──────────────────────────────────────

const TX_COLORS: Record<TxLog["type"], { bg: string; border: string; icon: React.ElementType; iconColor: string; label: string }> = {
  request_borrow:   { bg: "bg-blue-50",   border: "border-blue-200",   icon: BookMarked,  iconColor: "text-blue-600",   label: "Borrow Requested" },
  approve_borrow:   { bg: "bg-emerald-50",border: "border-emerald-200",icon: ThumbsUp,    iconColor: "text-emerald-600",label: "Borrow Approved" },
  reject_borrow:    { bg: "bg-red-50",    border: "border-red-200",    icon: ThumbsDown,  iconColor: "text-red-600",    label: "Borrow Rejected" },
  request_return:   { bg: "bg-violet-50", border: "border-violet-200", icon: RefreshCw,   iconColor: "text-violet-600", label: "Return Requested" },
  approve_return:   { bg: "bg-teal-50",   border: "border-teal-200",   icon: CheckCircle2,iconColor: "text-teal-600",   label: "Return Confirmed" },
  direct_checkout:  { bg: "bg-amber-50",  border: "border-amber-200",  icon: ArrowLeftRight, iconColor: "text-amber-700",label: "Direct Checkout" },
  direct_return:    { bg: "bg-stone-50",  border: "border-stone-300",  icon: CheckCircle2,iconColor: "text-stone-600",  label: "Direct Return" },
};

function HistoryTab({ logs }: { logs: TxLog[] }) {
  const sorted = [...logs].reverse();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2"><History size={16} className="text-primary" />Transaction Log</h2>
        <span className="text-xs font-mono text-muted-foreground">{logs.length} transaction{logs.length !== 1 ? "s" : ""}</span>
      </div>
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No transactions recorded yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map(log => {
            const cfg = TX_COLORS[log.type];
            const Icon = cfg.icon;
            return (
              <div key={log.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                <div className={`w-8 h-8 rounded-full bg-white/70 flex items-center justify-center shrink-0 mt-0.5 border ${cfg.border}`}>
                  <Icon size={14} className={cfg.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{cfg.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-white/60 px-1.5 py-0.5 rounded">{log.loanId}</span>
                  </div>
                  <div className="text-sm text-foreground mt-0.5">
                    <span className="font-medium">"{log.bookTitle}"</span>
                    <span className="text-muted-foreground"> by {log.author}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Student: <span className="font-medium">{log.student}</span> · <span className="font-mono">{log.studentId}</span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">{log.timestamp}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Borrow / Return Confirm Modals (Student) ─────────────────────────────────

function BorrowConfirmModal({ book, onConfirm, onClose }: { book: Book; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Confirm Borrow Request</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"><X size={15} /></button>
        </div>
        <div className="bg-secondary rounded-xl p-3 mb-4">
          <div className="font-medium text-sm">{book.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{book.author}</div>
          <div className="flex items-center gap-2 mt-2"><AvailabilityBar available={book.available} total={book.total} /></div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Your request will be sent to the librarian for approval. Once approved, your loan will be marked <span className="font-medium text-foreground">Active</span> with a 14-day due date.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-secondary">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90">Submit Request</button>
        </div>
      </div>
    </div>
  );
}

function ReturnConfirmModal({ loan, onConfirm, onClose }: { loan: Loan; onConfirm: () => void; onClose: () => void }) {
  const st = loanStatus(loan);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Request Return</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"><X size={15} /></button>
        </div>
        <div className="bg-secondary rounded-xl p-3 mb-4">
          <div className="font-medium text-sm">{loan.bookTitle}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{loan.author}</div>
          <div className="flex items-center gap-2 mt-2"><Clock size={11} className="text-muted-foreground" /><span className="text-xs font-mono text-muted-foreground">Due {loan.dueDate}</span><StatusBadge status={st} /></div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Bring the book to the library desk. The librarian will confirm receipt and mark it as <span className="font-medium text-foreground">Returned</span>.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-secondary">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90">Confirm Request</button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Library Tab ──────────────────────────────────────────────────────

function LibraryTab({ books, loans, user, onBorrow }: { books: Book[]; loans: Loan[]; user: AuthUser; onBorrow: (bookId: string) => string | null }) {
  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [sort, setSort] = useState<SortOption>("az");
  const [page, setPage] = useState(1);
  const [confirmBook, setConfirmBook] = useState<Book | null>(null);
  const [feedback, setFeedback] = useState<{ bookId: string; msg: string; ok: boolean } | null>(null);

  const myActiveBookIds = new Set(loans.filter(l => l.studentId === user.id && l.status !== "Returned").map(l => l.bookId));

  const filtered = sortBooks(books.filter(b => {
    const q = search.toLowerCase();
    return (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.includes(q) || b.genre.toLowerCase().includes(q))
      && (activeGenre === "All" || b.genre === activeGenre);
  }), sort);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleConfirmBorrow = () => {
    if (!confirmBook) return;
    const err = onBorrow(confirmBook.id);
    setFeedback({ bookId: confirmBook.id, msg: err ?? `Request submitted for "${confirmBook.title}". Awaiting librarian approval.`, ok: !err });
    setConfirmBook(null);
    setTimeout(() => setFeedback(null), 5000);
  };

  const getLoanStatus = (bookId: string) => {
    const loan = loans.find(l => l.studentId === user.id && l.bookId === bookId && l.status !== "Returned");
    if (!loan) return null;
    return loanStatus(loan);
  };

  return (
    <>
      {confirmBook && <BorrowConfirmModal book={confirmBook} onConfirm={handleConfirmBorrow} onClose={() => setConfirmBook(null)} />}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="w-full pl-9 pr-4 py-2.5 text-sm bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Search by title, author, or ISBN…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <SortSelect value={sort} onChange={v => { setSort(v); setPage(1); }} />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {ALL_GENRES.map(g => (
            <button key={g} onClick={() => { setActiveGenre(g); setPage(1); }}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${activeGenre === g ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>
              {g}
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {filtered.length} title{filtered.length !== 1 ? "s" : ""} · {filtered.filter(b => b.available > 0).length} available
          {activeGenre !== "All" && <span> in <span className="text-foreground">{activeGenre}</span></span>}
          {search && <span> matching "<span className="text-foreground">{search}</span>"</span>}
        </div>

        {feedback && (
          <div className={`flex gap-2 p-3 rounded-xl text-sm border ${feedback.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {feedback.ok ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <XCircle size={15} className="shrink-0 mt-0.5" />}
            {feedback.msg}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No books found.</div>
        ) : (
          <>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    {["Title / Author", "Genre", "ISBN", "Availability", ""].map((h, i) => (
                      <th key={i} className={`text-left px-4 py-3 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider ${i === 2 ? "hidden md:table-cell" : ""} ${i === 4 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((book, i) => {
                    const st = getLoanStatus(book.id);
                    return (
                      <tr key={book.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                        <td className="px-4 py-3"><div className="font-medium leading-snug">{book.title}</div><div className="text-xs text-muted-foreground mt-0.5">{book.author}</div></td>
                        <td className="px-4 py-3"><GenreChip genre={book.genre} small /></td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{book.isbn}</td>
                        <td className="px-4 py-3">
                          {book.available === 0
                            ? <span className="text-xs font-mono font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Out of Stock</span>
                            : <AvailabilityBar available={book.available} total={book.total} />}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {st ? <StatusBadge status={st} />
                            : book.available > 0
                              ? <button onClick={() => setConfirmBook(book)} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">Borrow</button>
                              : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}

// ─── Student Dashboard ────────────────────────────────────────────────────────

function StudentDashboard({ user, books, loans, onBorrow, onRequestReturn }: {
  user: AuthUser; books: Book[]; loans: Loan[];
  onBorrow: (bookId: string) => string | null;
  onRequestReturn: (loanId: string) => void;
}) {
  const [tab, setTab] = useState<StudentTab>("library");
  const [returnModal, setReturnModal] = useState<Loan | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const myLoans = loans.filter(l => l.studentId === user.id);
  const myActiveLoans = myLoans.filter(l => l.status !== "Returned").sort((a, b) => {
    const stA = loanStatus(a); const stB = loanStatus(b);
    if (stA === "Overdue") return -1; if (stB === "Overdue") return 1;
    return 0;
  });
  const myOverdue = myActiveLoans.filter(l => loanStatus(l) === "Overdue");
  const myUpcoming = myActiveLoans.filter(l => { const d = daysUntilDue(l); return loanStatus(l) === "Active" && d >= 0 && d <= 3; });
  const myHistory = myLoans.filter(l => l.status === "Returned").sort((a, b) => b.id.localeCompare(a.id));

  const tabs: { id: StudentTab; label: string; icon: React.ElementType }[] = [
    { id: "library", label: "Library", icon: Library },
    { id: "loans", label: `Active Loans (${myActiveLoans.length})`, icon: BookMarked },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <>
      {returnModal && <ReturnConfirmModal loan={returnModal} onConfirm={() => { onRequestReturn(returnModal.id); showToast(`Return request sent for "${returnModal.bookTitle}".`); setReturnModal(null); }} onClose={() => setReturnModal(null)} />}
      {toast && <Toast msg={toast} />}
      <div className="flex flex-col gap-5">
        <div id="student-alerts" />
        {myOverdue.map(loan => (
          <div key={loan.id} className="flex gap-3 p-4 bg-red-50 border border-red-300 rounded-xl text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div><div className="font-semibold">Overdue: "{loan.bookTitle}"</div>
              <div className="mt-0.5 text-red-700">Due <span className="font-mono font-medium">{loan.dueDate}</span> — <span className="font-semibold">{daysOverdue(loan)} days overdue.</span> Please return immediately.</div>
            </div>
          </div>
        ))}
        {myUpcoming.map(loan => (
          <div key={loan.id} className="flex gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <Clock size={15} className="shrink-0 text-amber-600 mt-0.5" />
            <div><span className="font-semibold">Due soon:</span> "{loan.bookTitle}" due on <span className="font-mono font-medium">{loan.dueDate}</span> — {daysUntilDue(loan) === 0 ? "today" : `${daysUntilDue(loan)} day${daysUntilDue(loan) > 1 ? "s" : ""} remaining`}.</div>
          </div>
        ))}

        <div className="flex gap-1 border-b border-border">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {tab === "library" && <LibraryTab books={books} loans={loans} user={user} onBorrow={onBorrow} />}

        {tab === "loans" && (
          myActiveLoans.length === 0
            ? <div className="text-center py-14 text-muted-foreground text-sm border border-dashed border-border rounded-xl">You have no active loans.</div>
            : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myActiveLoans.map(loan => {
                  const st = loanStatus(loan);
                  const isOverdue = st === "Overdue";
                  const isRequested = st === "Requested";
                  const isReturnRequested = st === "Return Requested";
                  const canRequestReturn = st === "Active" || st === "Overdue";
                  return (
                    <div key={loan.id} className={`border rounded-xl p-4 flex gap-3 ${isOverdue ? "bg-red-50 border-red-200" : isRequested ? "bg-blue-50 border-blue-200" : isReturnRequested ? "bg-violet-50 border-violet-200" : "bg-card border-border"}`}>
                      <div className={`w-10 h-14 rounded flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-100" : isRequested ? "bg-blue-100" : isReturnRequested ? "bg-violet-100" : "bg-primary/10"}`}>
                        <BookOpen size={16} className={isOverdue ? "text-red-600" : isRequested ? "text-blue-600" : isReturnRequested ? "text-violet-600" : "text-primary"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm leading-snug">{loan.bookTitle}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{loan.author}</div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {!isRequested && <><Clock size={11} className={isOverdue ? "text-red-500" : "text-muted-foreground"} /><span className={`text-xs font-mono font-medium ${isOverdue ? "text-red-700" : "text-muted-foreground"}`}>Due {loan.dueDate}</span></>}
                          <StatusBadge status={st} />
                        </div>
                        {isRequested && <p className="text-xs text-blue-600 mt-1.5">Awaiting librarian approval.</p>}
                        {isReturnRequested && <p className="text-xs text-violet-600 mt-1.5">Return pending confirmation.</p>}
                        {canRequestReturn && (
                          <button onClick={() => setReturnModal(loan)}
                            className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border text-muted-foreground rounded-lg hover:bg-secondary hover:text-foreground transition-colors">
                            <RefreshCw size={11} /> Request Return
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {tab === "history" && (
          myHistory.length === 0
            ? <div className="text-center py-14 text-muted-foreground text-sm border border-dashed border-border rounded-xl">No past loans on record.</div>
            : <div className="flex flex-col">
                {myHistory.map(loan => (
                  <div key={loan.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium">{loan.bookTitle}</div>
                      <div className="text-xs text-muted-foreground">{loan.author} · Borrowed {loan.borrowDate}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground hidden sm:inline">Returned {loan.returnDate}</span>
                      <StatusBadge status="Returned" />
                    </div>
                  </div>
                ))}
              </div>
        )}
      </div>
    </>
  );
}

// ─── Students Tab ─────────────────────────────────────────────────────────────

function StudentsTab({ loans, logs }: { loans: Loan[]; logs: TxLog[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudentProfile | null>(null);

  const filtered = STUDENT_PROFILES.filter(s => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.id.includes(q) || s.section.toLowerCase().includes(q) || s.course.toLowerCase().includes(q);
  });

  const getStudentLoans = (id: string) => loans.filter(l => l.studentId === id);
  const getStudentLogs  = (id: string) => [...logs.filter(l => l.studentId === id)].reverse();

  const activeFor  = (id: string) => getStudentLoans(id).filter(l => l.status === "Active" || loanStatus(loans.find(x => x.id === l.id)!) === "Overdue");
  const requestsFor = (id: string) => getStudentLoans(id).filter(l => l.status === "Requested" || l.status === "Return Requested");
  const historyFor  = (id: string) => getStudentLoans(id).filter(l => l.status === "Returned");

  return (
    <div className="flex gap-5 h-full" style={{ minHeight: 500 }}>
      {/* Student list */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full pl-8 pr-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="text-xs font-mono text-muted-foreground">{filtered.length} registered student{filtered.length !== 1 ? "s" : ""}</div>
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1" style={{ maxHeight: 520 }}>
          {filtered.map(s => {
            const overdueCount = getStudentLoans(s.id).filter(l => loanStatus(loans.find(x => x.id === l.id) ?? l) === "Overdue").length;
            const activeCount  = activeFor(s.id).length;
            const reqCount     = requestsFor(s.id).length;
            const isSelected   = selected?.id === s.id;
            return (
              <button key={s.id} onClick={() => setSelected(s)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted/50"}`}>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold truncate leading-snug ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{s.name}</div>
                    <div className={`text-xs font-mono mt-0.5 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{s.id}</div>
                    <div className={`text-xs mt-0.5 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{s.section}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {overdueCount > 0 && <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-red-500 text-white rounded-full">{overdueCount} overdue</span>}
                    {activeCount > 0 && !overdueCount && <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{activeCount} active</span>}
                    {reqCount > 0 && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">{reqCount} req</span>}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No students found.</div>}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-border shrink-0" />

      {/* Detail panel */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-16">
            <Users size={32} className="opacity-20" />
            <span className="text-sm">Select a student to view their profile</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Profile info */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>{selected.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{selected.course} · {selected.yearLevel}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                {[
                  { label: "Student Number", value: selected.id, mono: true },
                  { label: "Section",        value: selected.section, mono: false },
                  { label: "Email",          value: selected.email, mono: true },
                  { label: "Course",         value: selected.course, mono: false },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
                    <div className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active loans */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <BookMarked size={14} className="text-primary" />
                Active Loans ({activeFor(selected.id).length})
              </h3>
              {activeFor(selected.id).length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 border border-dashed border-border rounded-xl text-center">No active loans.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {activeFor(selected.id).map(loan => {
                    const st = loanStatus(loan);
                    return (
                      <div key={loan.id} className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${st === "Overdue" ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                        <div>
                          <div className="text-sm font-medium">{loan.bookTitle}</div>
                          <div className="text-xs text-muted-foreground">{loan.author}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock size={11} className="text-muted-foreground" />
                            <span className={`text-xs font-mono ${st === "Overdue" ? "text-red-700 font-semibold" : "text-muted-foreground"}`}>Due {loan.dueDate}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={st} />
                          {st === "Overdue" && <span className="text-[10px] font-mono text-red-600">+{daysOverdue(loan)} days</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending requests */}
            {requestsFor(selected.id).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle size={14} className="text-blue-600" />
                  Pending Requests ({requestsFor(selected.id).length})
                </h3>
                <div className="flex flex-col gap-2">
                  {requestsFor(selected.id).map(loan => {
                    const st = loanStatus(loan);
                    return (
                      <div key={loan.id} className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${st === "Return Requested" ? "bg-violet-50 border-violet-200" : "bg-blue-50 border-blue-200"}`}>
                        <div>
                          <div className="text-sm font-medium">{loan.bookTitle}</div>
                          <div className="text-xs text-muted-foreground">{loan.author}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{loan.borrowDate}</div>
                        </div>
                        <StatusBadge status={st} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transaction history */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <History size={14} className="text-primary" />
                Transaction History ({getStudentLogs(selected.id).length})
              </h3>
              {getStudentLogs(selected.id).length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 border border-dashed border-border rounded-xl text-center">No transactions on record.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {getStudentLogs(selected.id).map(log => {
                    const cfg = TX_COLORS[log.type];
                    const Icon = cfg.icon;
                    return (
                      <div key={log.id} className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                        <div className={`w-7 h-7 rounded-full bg-white/70 border ${cfg.border} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon size={13} className={cfg.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold">{cfg.label}</span>
                            <span className="text-[10px] font-mono text-muted-foreground bg-white/60 px-1.5 py-0.5 rounded">{log.loanId}</span>
                          </div>
                          <div className="text-sm font-medium mt-0.5">"{log.bookTitle}"</div>
                          <div className="text-[10px] font-mono text-muted-foreground mt-1">{log.timestamp}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Returned / reading history */}
            {historyFor(selected.id).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-stone-500" />
                  Returned Books ({historyFor(selected.id).length})
                </h3>
                <div className="flex flex-col">
                  {historyFor(selected.id).map(loan => (
                    <div key={loan.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div>
                        <div className="text-sm font-medium">{loan.bookTitle}</div>
                        <div className="text-xs text-muted-foreground">{loan.author} · Borrowed {loan.borrowDate}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-muted-foreground hidden sm:inline">Returned {loan.returnDate}</span>
                        <StatusBadge status="Returned" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Super Admin Dashboard ────────────────────────────────────────────────────

type AdminTab = "dashboard" | "audit" | "users" | "system";

const SYSTEM_ACCOUNTS = [
  { id: "LIB-001", name: "Juan Dela Cruz", role: "Librarian", email: "juandelacruz@email.com", status: "Active", lastLogin: "Jul 1, 2026" },
  ...STUDENT_PROFILES.map(s => ({ id: s.id, name: s.name, role: "Student", email: s.email, status: "Active", lastLogin: "Jun 28, 2026" })),
];

function AdminStatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={`${color} mb-2`}><Icon size={16} /></div>
      <div className="text-2xl font-semibold" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{sub}</div>
    </div>
  );
}

function HealthBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SuperAdminDashboard({ books, loans, logs, onLogout }: {
  books: Book[]; loans: Loan[]; logs: TxLog[]; onLogout: () => void;
}) {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditTypeFilter, setAuditTypeFilter] = useState<TxLog["type"] | "all">("all");
  const [auditPage, setAuditPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalVolumes   = books.reduce((s, b) => s + b.total, 0);
  const totalAvail     = books.reduce((s, b) => s + b.available, 0);
  const activeLoans    = loans.filter(l => l.status === "Active").length;
  const overdueCount   = loans.filter(l => loanStatus(l) === "Overdue").length;
  const pendingCount   = loans.filter(l => l.status === "Requested" || l.status === "Return Requested").length;
  const outOfStock     = books.filter(b => b.available === 0).length;

  // Audit log filter
  const filteredLogs = [...logs].reverse().filter(l => {
    const q = auditSearch.toLowerCase();
    const matchQ = !q || l.bookTitle.toLowerCase().includes(q) || l.student.toLowerCase().includes(q)
      || l.studentId.includes(q) || l.type.includes(q) || l.id.includes(q);
    const matchType = auditTypeFilter === "all" || l.type === auditTypeFilter;
    return matchQ && matchType;
  });
  const AUDIT_PER = 15;
  const pagedLogs = filteredLogs.slice((auditPage - 1) * AUDIT_PER, auditPage * AUDIT_PER);

  const filteredUsers = SYSTEM_ACCOUNTS.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const exportAudit = () => {
    const lines = [
      "KEEP — SUPER ADMIN AUDIT EXPORT",
      `Generated: ${formatDate(TODAY)}`,
      "",
      ["Log ID","Type","Book Title","Student","Student No.","Timestamp"].join(","),
      ...filteredLogs.map(l => [l.id, l.type, `"${l.bookTitle}"`, l.student, l.studentId, `"${l.timestamp}"`].join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `keep_audit_${formatDate(TODAY).replace(/ /g,"_").replace(",","")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const adminTabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard",  icon: Activity },
    { id: "audit",     label: `Audit Logs (${logs.length})`, icon: Terminal },
    { id: "users",     label: "Users & Accounts", icon: UserCheck },
    { id: "system",    label: "System Controls",  icon: Settings },
  ];

  const typeOptions: { value: TxLog["type"] | "all"; label: string }[] = [
    { value: "all",            label: "All Types" },
    { value: "request_borrow", label: "Borrow Request" },
    { value: "approve_borrow", label: "Borrow Approved" },
    { value: "reject_borrow",  label: "Borrow Rejected" },
    { value: "request_return", label: "Return Request" },
    { value: "approve_return", label: "Return Confirmed" },
    { value: "direct_checkout",label: "Direct Checkout" },
    { value: "direct_return",  label: "Direct Return" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
      {toast && <Toast msg={toast} />}

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center">
              <img src={keepLogo} alt="Keep logo" className="w-7 h-7 object-contain" style={{ mixBlendMode: "multiply" }} />
            </div>
            <span className="font-semibold text-lg tracking-tight" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Keep</span>
            <span className="hidden sm:inline text-xs border-l border-border pl-2.5 ml-0.5 font-mono text-muted-foreground">Super Admin Console</span>
          </div>
          <div className="flex items-center gap-2">
            {maintenanceMode && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-lg text-xs font-mono text-amber-800">
                <Zap size={11} /> Maintenance Mode
              </span>
            )}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center"><Shield size={13} className="text-amber-700" /></div>
              <div className="hidden sm:block text-xs leading-none">
                <div className="font-medium">System Administrator</div>
                <div className="text-muted-foreground mt-0.5 font-mono text-amber-700">Super Admin</div>
              </div>
            </div>
            <button onClick={onLogout} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg">
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-semibold text-2xl" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Super Admin Console</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full">PRIVILEGED ACCESS</span>
          </div>
          <p className="text-sm text-muted-foreground">Batangas State University · Keep LMS · {formatDate(TODAY)}</p>
        </div>

        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {adminTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div className="flex flex-col gap-7">
            {/* Alerts */}
            {(overdueCount > 0 || pendingCount > 0 || maintenanceMode || outOfStock > 0) && (
              <section>
                <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alert Center</h3>
                <div className="flex flex-col gap-2">
                  {maintenanceMode && (
                    <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl">
                      <Zap size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-sm"><span className="font-semibold text-amber-800">Maintenance Mode Active</span><span className="text-amber-700"> — The system is in maintenance mode. Regular users may experience restricted access.</span></div>
                    </div>
                  )}
                  {overdueCount > 0 && (
                    <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                      <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                      <div className="text-sm"><span className="font-semibold text-red-800">{overdueCount} Overdue Item{overdueCount !== 1 ? "s" : ""}</span><span className="text-red-700"> — Students have unreturned books past their due dates. Librarian follow-up required.</span></div>
                    </div>
                  )}
                  {pendingCount > 0 && (
                    <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                      <Bell size={15} className="text-blue-600 shrink-0 mt-0.5" />
                      <div className="text-sm"><span className="font-semibold text-blue-800">{pendingCount} Pending Request{pendingCount !== 1 ? "s" : ""}</span><span className="text-blue-700"> — Borrow or return requests awaiting librarian action.</span></div>
                    </div>
                  )}
                  {outOfStock > 0 && (
                    <div className="flex items-start gap-3 p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
                      <XCircle size={15} className="text-stone-500 shrink-0 mt-0.5" />
                      <div className="text-sm"><span className="font-semibold text-stone-700">{outOfStock} Title{outOfStock !== 1 ? "s" : ""} Out of Stock</span><span className="text-stone-600"> — No copies available for borrowing. Consider restocking.</span></div>
                    </div>
                  )}
                  {overdueCount === 0 && pendingCount === 0 && !maintenanceMode && outOfStock === 0 && (
                    <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                      <CheckCircle2 size={15} className="shrink-0" /><span className="font-medium">All systems normal.</span> No critical alerts at this time.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Global stats */}
            <section>
              <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">Global Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AdminStatCard label="Total Book Titles" value={books.length} sub={`${totalVolumes} volumes total`} icon={BookOpen} color="text-primary" />
                <AdminStatCard label="Available Copies" value={totalAvail} sub={`${totalVolumes - totalAvail} checked out`} icon={CheckCircle2} color="text-emerald-600" />
                <AdminStatCard label="Active Loans" value={activeLoans} sub={`${overdueCount} overdue`} icon={BookMarked} color="text-amber-600" />
                <AdminStatCard label="Pending Requests" value={pendingCount} sub="Awaiting action" icon={Bell} color="text-blue-600" />
                <AdminStatCard label="Registered Students" value={STUDENT_PROFILES.length} sub="Active accounts" icon={Users} color="text-violet-600" />
                <AdminStatCard label="Out-of-Stock Titles" value={outOfStock} sub="Need restocking" icon={AlertTriangle} color="text-red-600" />
                <AdminStatCard label="Total Transactions" value={logs.length} sub="This session" icon={History} color="text-stone-500" />
                <AdminStatCard label="System Accounts" value={SYSTEM_ACCOUNTS.length + 1} sub="1 librarian · 5 students · 1 admin" icon={Shield} color="text-amber-700" />
              </div>
            </section>

            {/* System health */}
            <section>
              <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">System Health Monitor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2"><Server size={14} className="text-primary" />Server Status</span>
                    <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />ONLINE
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <HealthBar label="CPU Usage" value={23} max={100} color="bg-emerald-500" />
                    <HealthBar label="Memory Usage" value={61} max={100} color="bg-amber-500" />
                    <HealthBar label="Storage Used" value={38} max={100} color="bg-emerald-500" />
                    <HealthBar label="Network I/O" value={12} max={100} color="bg-emerald-500" />
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                  <span className="text-sm font-medium flex items-center gap-2"><Database size={14} className="text-primary" />Database & Services</span>
                  {[
                    { label: "Database Connection", status: "Connected", ok: true },
                    { label: "Session Service",      status: "Running",   ok: true },
                    { label: "Notification Service", status: "Running",   ok: true },
                    { label: "Backup Service",        status: maintenanceMode ? "Paused" : "Scheduled", ok: !maintenanceMode },
                    { label: "Audit Logger",          status: "Active",   ok: true },
                    { label: "Overdue Sweep",         status: "Scheduled · Daily", ok: true },
                  ].map(({ label, status, ok }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-mono font-medium px-2 py-0.5 rounded ${ok ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Live audit feed */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />Live Audit Feed
                </h3>
                <button onClick={() => setTab("audit")} className="text-xs text-primary hover:underline font-mono">View all →</button>
              </div>
              {logs.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl text-center py-10 text-muted-foreground text-sm">No transactions recorded yet.</div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {[...logs].reverse().slice(0, 8).map(log => {
                    const cfg = TX_COLORS[log.type];
                    const Icon = cfg.icon;
                    return (
                      <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className={`w-7 h-7 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
                          <Icon size={12} className={cfg.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold">{cfg.label}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{log.student} · {log.studentId}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">"{log.bookTitle}"</div>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:inline">{log.timestamp}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── AUDIT LOG TAB ── */}
        {tab === "audit" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-semibold flex items-center gap-2"><Terminal size={16} className="text-primary" />Full Audit Log</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{filteredLogs.length} of {logs.length} records</span>
                <button onClick={exportAudit} className="flex items-center gap-2 px-3 py-1.5 border border-border text-xs font-medium rounded-lg hover:bg-secondary transition-colors">
                  <Download size={12} /> Export CSV
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input className="w-full pl-8 pr-3 py-2 text-xs bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Search by book, student, ID, or type…" value={auditSearch}
                  onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }} />
              </div>
              <select value={auditTypeFilter} onChange={e => { setAuditTypeFilter(e.target.value as TxLog["type"] | "all"); setAuditPage(1); }}
                className="text-xs px-2.5 py-2 bg-input-background border border-border rounded-lg focus:outline-none">
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {(auditSearch || auditTypeFilter !== "all") && (
                <button onClick={() => { setAuditSearch(""); setAuditTypeFilter("all"); setAuditPage(1); }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-secondary border border-border flex items-center gap-1">
                  <X size={11} /> Clear
                </button>
              )}
            </div>

            {/* Log table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    {["Log ID", "Event Type", "Book Title", "Student", "Student No.", "Timestamp"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-mono font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.map((log, i) => {
                    const cfg = TX_COLORS[log.type];
                    const Icon = cfg.icon;
                    return (
                      <tr key={log.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{log.id}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Icon size={11} className={cfg.iconColor} />
                            <span className={`font-medium ${cfg.iconColor}`}>{cfg.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-medium truncate max-w-[180px]">"{log.bookTitle}"</td>
                        <td className="px-3 py-2.5">{log.student}</td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{log.studentId}</td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{log.timestamp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredLogs.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No log entries match your search.</div>}
            </div>
            <Pager page={auditPage} total={filteredLogs.length} perPage={AUDIT_PER} onChange={setAuditPage} />
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-semibold flex items-center gap-2"><UserCheck size={16} className="text-primary" />System Accounts</h2>
              <span className="text-xs font-mono text-muted-foreground">{filteredUsers.length} of {SYSTEM_ACCOUNTS.length} accounts</span>
            </div>

            <div className="relative max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="w-full pl-8 pr-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="Search by name, ID, email, or role…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </div>

            {/* Super admin shown first */}
            <div className="border border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden mb-1">
              <div className="px-4 py-2 border-b border-amber-200 flex items-center gap-2">
                <Shield size={12} className="text-amber-700" />
                <span className="text-xs font-semibold text-amber-800 font-mono uppercase tracking-wider">Super Administrator</span>
              </div>
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0"><Shield size={15} className="text-amber-700" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">System Administrator</div>
                  <div className="text-xs font-mono text-muted-foreground">SA-001 · admin@batstate-u.edu.ph</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 rounded-full">Super Admin</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full">Active</span>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    {["Account", "Role", "Email", "Status", "Last Login"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${u.role === "Librarian" ? "bg-primary/10" : "bg-secondary"}`}>
                            <User size={12} className={u.role === "Librarian" ? "text-primary" : "text-muted-foreground"} />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{u.name}</div>
                            <div className="text-xs font-mono text-muted-foreground">{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${u.role === "Librarian" ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary text-muted-foreground border-border"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{u.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{u.lastLogin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No accounts match your search.</div>}
            </div>

            <div className="p-4 bg-muted/50 border border-border rounded-xl text-xs text-muted-foreground flex items-start gap-2">
              <Lock size={13} className="shrink-0 mt-0.5 text-primary" />
              <span><span className="font-medium text-foreground">Role management</span> — Account provisioning, password resets, and permission changes are performed via the university IT portal. This view is read-only for audit purposes.</span>
            </div>
          </div>
        )}

        {/* ── SYSTEM CONTROLS TAB ── */}
        {tab === "system" && (
          <div className="flex flex-col gap-6 max-w-2xl">
            <h2 className="font-semibold flex items-center gap-2"><Settings size={16} className="text-primary" />System Controls</h2>

            {/* Maintenance mode */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium flex items-center gap-2"><Zap size={15} className="text-amber-600" />Maintenance Mode</div>
                  <p className="text-sm text-muted-foreground mt-1">When enabled, the system displays a maintenance notice to librarians and students. Super admin access is unaffected.</p>
                </div>
                <button onClick={() => { setMaintenanceMode(v => !v); showToast(maintenanceMode ? "Maintenance mode disabled." : "Maintenance mode enabled."); }}
                  className={`shrink-0 relative w-12 h-6 rounded-full border transition-colors ${maintenanceMode ? "bg-amber-500 border-amber-600" : "bg-border border-border"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${maintenanceMode ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
              {maintenanceMode && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <AlertTriangle size={12} className="shrink-0" />Maintenance mode is <span className="font-semibold">active</span>. Toggle off to restore normal access.
                </div>
              )}
            </div>

            {/* Session timeout */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              <div className="font-medium flex items-center gap-2"><Lock size={15} className="text-primary" />Session Timeout</div>
              <p className="text-sm text-muted-foreground">Automatically logs out inactive users to prevent unauthorized access.</p>
              <div className="flex items-center gap-3">
                <select value={sessionTimeout} onChange={e => { setSessionTimeout(Number(e.target.value)); showToast(`Session timeout set to ${e.target.value} minutes.`); }}
                  className="text-sm px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30">
                  {[10, 15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v} minutes</option>)}
                </select>
                <span className="text-xs text-muted-foreground font-mono">Current: {sessionTimeout}m inactivity</span>
              </div>
            </div>

            {/* System info */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              <div className="font-medium flex items-center gap-2"><HardDrive size={15} className="text-primary" />System Information</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Application", value: "Keep LMS v1.0" },
                  { label: "Institution", value: "Batangas State University" },
                  { label: "Environment", value: "Production" },
                  { label: "Session Date", value: formatDate(TODAY) },
                  { label: "Total Books", value: `${books.length} titles · ${totalVolumes} volumes` },
                  { label: "Total Transactions", value: `${logs.length} logged` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
                    <div className="text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              <div className="font-medium flex items-center gap-2"><Shield size={15} className="text-primary" />Security Settings</div>
              {[
                { label: "Multi-Factor Authentication", status: "Enforced", ok: true },
                { label: "IP Whitelist Restriction",    status: "Not configured", ok: false },
                { label: "Audit Logging",               status: "Active", ok: true },
                { label: "Automatic Session Timeout",   status: `${sessionTimeout} min`, ok: true },
                { label: "HTTPS / TLS Encryption",      status: "Enabled", ok: true },
              ].map(({ label, status, ok }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-4 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Keep v1.0 · Batangas State University · Super Admin Console</span>
          <span className="flex items-center gap-1.5"><Wifi size={11} /> System Online · Uptime 99.8%</span>
        </div>
      </footer>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [loans, setLoans] = useState<Loan[]>(INITIAL_LOANS);
  const [libTab, setLibTab] = useState<LibTab>("inventory");
  const [loanCounter, setLoanCounter] = useState(() =>
    Math.max(...INITIAL_LOANS.map(l => parseInt(l.id.slice(1), 10))) + 1
  );
  const [notifEvents, setNotifEvents] = useState<AppNotif[]>([]);
  const [txLogs, setTxLogs] = useState<TxLog[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("checkout");

  if (!user) return <LoginScreen onLogin={u => { setUser(u); setLibTab("inventory"); }} />;

  if (user.role === "superadmin") {
    return <SuperAdminDashboard books={books} loans={loans} logs={txLogs} onLogout={() => setUser(null)} />;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pushNotif = (n: Omit<AppNotif, "id" | "timestamp">) =>
    setNotifEvents(prev => [...prev, { ...n, id: `n-${Date.now()}`, timestamp: formatDate(TODAY) }]);

  const pushLog = (n: Omit<TxLog, "id" | "timestamp">) =>
    setTxLogs(prev => [...prev, { ...n, id: `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: formatTimestamp() }]);

  const nextLoanId = () => {
    const id = `L${String(loanCounter).padStart(3, "0")}`;
    setLoanCounter(c => c + 1);
    return id;
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addBook = (f: BookForm) => {
    const n = Number(f.total);
    const newId = `B${String(books.length + 1).padStart(3, "0")}`;
    setBooks(prev => [...prev, { id: newId, title: f.title, author: f.author, isbn: f.isbn, genre: f.genre, total: n, available: n }]);
  };
  const editBook = (id: string, f: BookForm) => {
    const n = Number(f.total);
    setBooks(prev => prev.map(b => b.id !== id ? b : { ...b, title: f.title, author: f.author, isbn: f.isbn, genre: f.genre, total: n }));
  };
  const deleteBook = (id: string) => setBooks(prev => prev.filter(b => b.id !== id));

  const processCheckout = (srCode: string, studentName: string, bookId: string): string | null => {
    if (!srCode || !bookId) return "Student Number and Book ID are required.";
    const book = books.find(b => b.id === bookId);
    if (!book) return `Book ID "${bookId}" not found.`;
    if (book.available === 0) return `All copies of "${book.title}" are checked out. Transaction aborted.`;
    if (loans.find(l => l.studentId === srCode && l.bookId === bookId && l.status !== "Returned")) return `${srCode} already has this book.`;
    const resolvedName = STUDENT_REGISTRY[srCode] || studentName || srCode;
    const loanId = nextLoanId();
    setLoans(prev => [...prev, { id: loanId, bookId, bookTitle: book.title, author: book.author, student: resolvedName, studentId: srCode, borrowDate: formatDate(TODAY), dueDate: formatDate(addDays(TODAY, 14)), status: "Active" }]);
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, available: b.available - 1 } : b));
    pushLog({ type: "direct_checkout", bookTitle: book.title, author: book.author, student: resolvedName, studentId: srCode, loanId });
    return null;
  };

  const processReturn = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: "Returned", returnDate: formatDate(TODAY) } : l));
    setBooks(prev => prev.map(b => b.id === loan.bookId ? { ...b, available: Math.min(b.available + 1, b.total) } : b));
    pushLog({ type: "direct_return", bookTitle: loan.bookTitle, author: loan.author, student: loan.student, studentId: loan.studentId, loanId });
  };

  const requestBorrow = (bookId: string): string | null => {
    const book = books.find(b => b.id === bookId);
    if (!book) return "Book not found.";
    if (book.available === 0) return `No copies of "${book.title}" are available.`;
    if (loans.find(l => l.studentId === user.id && l.bookId === bookId && l.status !== "Returned")) return "You already have a loan or request for this book.";
    const loanId = nextLoanId();
    setLoans(prev => [...prev, { id: loanId, bookId, bookTitle: book.title, author: book.author, student: user.name, studentId: user.id, borrowDate: formatDate(TODAY), dueDate: formatDate(addDays(TODAY, 14)), status: "Requested" }]);
    pushLog({ type: "request_borrow", bookTitle: book.title, author: book.author, student: user.name, studentId: user.id, loanId });
    return null;
  };

  const approveBorrow = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId); if (!loan) return;
    const book = books.find(b => b.id === loan.bookId); if (!book || book.available === 0) return;
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: "Active", borrowDate: formatDate(TODAY), dueDate: formatDate(addDays(TODAY, 14)) } : l));
    setBooks(prev => prev.map(b => b.id === loan.bookId ? { ...b, available: b.available - 1 } : b));
    pushNotif({ forUserId: loan.studentId, type: "borrow_approved", bookTitle: loan.bookTitle });
    pushLog({ type: "approve_borrow", bookTitle: loan.bookTitle, author: loan.author, student: loan.student, studentId: loan.studentId, loanId });
  };

  const rejectBorrow = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (loan) { pushNotif({ forUserId: loan.studentId, type: "borrow_rejected", bookTitle: loan.bookTitle }); pushLog({ type: "reject_borrow", bookTitle: loan.bookTitle, author: loan.author, student: loan.student, studentId: loan.studentId, loanId }); }
    setLoans(prev => prev.filter(l => l.id !== loanId));
  };

  const requestReturn = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId); if (!loan) return;
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: "Return Requested" } : l));
    pushLog({ type: "request_return", bookTitle: loan.bookTitle, author: loan.author, student: loan.student, studentId: loan.studentId, loanId });
  };

  const approveReturn = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId); if (!loan) return;
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: "Returned", returnDate: formatDate(TODAY) } : l));
    setBooks(prev => prev.map(b => b.id === loan.bookId ? { ...b, available: Math.min(b.available + 1, b.total) } : b));
    pushNotif({ forUserId: loan.studentId, type: "return_confirmed", bookTitle: loan.bookTitle });
    pushLog({ type: "approve_return", bookTitle: loan.bookTitle, author: loan.author, student: loan.student, studentId: loan.studentId, loanId });
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const overdueCount = loans.filter(l => loanStatus(l) === "Overdue").length;
  const pendingCount = loans.filter(l => l.status === "Requested" || l.status === "Return Requested").length;
  const myOverdueCount = user.role === "student" ? loans.filter(l => l.studentId === user.id && loanStatus(l) === "Overdue").length : 0;
  const myUpcomingCount = user.role === "student" ? loans.filter(l => { const d = daysUntilDue(l); return l.studentId === user.id && loanStatus(l) === "Active" && d >= 0 && d <= 3; }).length : 0;
  const myEventCount = notifEvents.filter(e => e.forUserId === user.id).length;
  const hasNotif = user.role === "librarian" ? (overdueCount + pendingCount) > 0 : (myOverdueCount + myUpcomingCount + myEventCount) > 0;

  const libTabs: { id: LibTab; label: string; icon: React.ElementType }[] = [
    { id: "inventory", label: "Inventory Control", icon: BookOpen },
    { id: "checkout",  label: "Checkout / Return", icon: ArrowLeftRight },
    { id: "overdue",   label: "Overdue",            icon: AlertTriangle },
    { id: "reports",   label: "Reports",            icon: BarChart3 },
    { id: "students",  label: "Students",           icon: Users },
    { id: "history",   label: "History",            icon: History },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center">
              <img src={keepLogo} alt="Keep logo" className="w-7 h-7 object-contain" style={{ mixBlendMode: "multiply" }} />
            </div>
            <span className="font-semibold text-lg tracking-tight" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Keep</span>
            <span className="text-xs text-muted-foreground border-l border-border pl-2.5 ml-0.5 font-mono hidden sm:inline">Library Management System</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setNotifOpen(v => !v)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg relative">
                <Bell size={15} />
                {hasNotif && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-card" />}
              </button>
              {notifOpen && (
                <NotificationPanel user={user} loans={loans} events={notifEvents} onClose={() => setNotifOpen(false)}
                  onNavigate={(tab, mode) => { setLibTab(tab); if (mode) setCheckoutMode(mode as CheckoutMode); setNotifOpen(false); }} />
              )}
            </div>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><User size={13} className="text-primary" /></div>
              <div className="hidden sm:block text-xs leading-none">
                <div className="font-medium">{user.name}</div>
                <div className="text-muted-foreground mt-0.5 font-mono capitalize">{user.role}</div>
              </div>
              <ChevronDown size={13} className="text-muted-foreground hidden sm:block" />
            </div>
            <button onClick={() => setUser(null)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg">
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6">
        {user.role === "librarian" ? (
          <>
            <div className="mb-6">
              <h1 className="font-semibold text-2xl" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Librarian Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Batangas State University · {formatDate(TODAY)}</p>
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
            {libTab === "inventory" && <InventoryTab books={books} loans={loans} onAdd={addBook} onEdit={editBook} onDelete={deleteBook} />}
            {libTab === "checkout" && <CheckoutTab books={books} loans={loans} onCheckout={processCheckout} onReturn={processReturn} onApproveBorrow={approveBorrow} onRejectBorrow={rejectBorrow} onApproveReturn={approveReturn} initialMode={checkoutMode} />}
            {libTab === "overdue"   && <OverdueTab loans={loans} />}
            {libTab === "reports"   && <ReportsTab books={books} loans={loans} logs={txLogs} />}
            {libTab === "students"  && <StudentsTab loans={loans} logs={txLogs} />}
            {libTab === "history"   && <HistoryTab logs={txLogs} />}
          </>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="font-semibold text-2xl" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>Welcome back, {user.name.split(" ")[0]}.</h1>
              <p className="text-sm text-muted-foreground mt-1">Student Number: <span className="font-mono">{user.id}</span> · BSIT 2201</p>
            </div>
            <StudentDashboard user={user} books={books} loans={loans} onBorrow={requestBorrow} onRequestReturn={requestReturn} />
          </>
        )}
      </main>

      <footer className="border-t border-border py-4 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Keep v1.0 · Batangas State University</span>
          <span>Session active · Uptime 99.8%</span>
        </div>
      </footer>
    </div>
  );
}
