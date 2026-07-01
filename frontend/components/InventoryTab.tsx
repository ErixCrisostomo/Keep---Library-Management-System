"use client";

import { useState } from "react";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { Book, BookForm } from "@/lib/types";
import { AvailabilityBar, Toast } from "@/components/shared";
import { BookModal } from "@/components/BookModal";

interface InventoryTabProps {
  books: Book[];
  onAdd: (f: BookForm) => Promise<void>;
  onEdit: (id: string, f: BookForm) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function InventoryTab({ books, onAdd, onEdit, onDelete }: InventoryTabProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "unavailable">("all");
  const [modalBook, setModalBook] = useState<Book | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [toast, setToast] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    return (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.includes(q))
      && (filter === "all" || (filter === "available" ? b.available > 0 : b.available === 0));
  });

  const handleSave = async (form: BookForm) => {
    try {
      if (modalBook === "new") {
        await onAdd(form);
        showToast(`"${form.title}" added to catalog.`);
      } else if (modalBook) {
        await onEdit(modalBook.id, form);
        showToast(`"${form.title}" updated.`);
      }
      setModalBook(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
      showToast(`"${deleteTarget.title}" removed.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not delete this book.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
    setDeleteTarget(null);
  };

  return (
    <>
      {modalBook !== null && <BookModal book={modalBook === "new" ? null : modalBook} onClose={() => setModalBook(null)} onSave={handleSave} />}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5">
            <h2 className="font-semibold mb-1">Delete Book?</h2>
            <p className="text-sm text-muted-foreground mb-4">Remove <span className="font-medium text-foreground">&quot;{deleteTarget.title}&quot;</span> from the catalog? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-secondary">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-destructive text-destructive-foreground text-sm font-semibold rounded-xl hover:opacity-90">Delete</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast msg={toast} />}
      <div className="flex flex-col gap-5">
        {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errorMsg}</div>}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="w-full pl-9 pr-4 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Search by title, author, or ISBN…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {(["all", "available", "unavailable"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${filter === f ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setModalBook("new")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
            <Plus size={14} /> Add Book
          </button>
        </div>
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
              {filtered.map((book, i) => (
                <tr key={book.id} className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${i % 2 === 1 ? "bg-card/40" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{book.id}</td>
                  <td className="px-4 py-3"><div className="font-medium leading-snug">{book.title}</div><div className="text-xs text-muted-foreground mt-0.5">{book.author}</div></td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{book.isbn}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs px-2 py-0.5 bg-secondary rounded">{book.genre}</span></td>
                  <td className="px-4 py-3">
                    {book.available === 0
                      ? <span className="text-xs font-mono font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Out of Stock</span>
                      : <AvailabilityBar available={book.available} total={book.total} />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModalBook(book)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => setDeleteTarget(book)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No books match your search.</div>}
        </div>
      </div>
    </>
  );
}
