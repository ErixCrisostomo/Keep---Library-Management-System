"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Book, BookForm } from "@/lib/types";
import { GENRES_LIST, EMPTY_BOOK_FORM, validateISBN } from "@/lib/constants";

export function BookModal({
  book, onClose, onSave,
}: { book: Book | null; onClose: () => void; onSave: (f: BookForm) => void }) {
  const [form, setForm] = useState<BookForm>(
    book ? { title: book.title, author: book.author, isbn: book.isbn, genre: book.genre, total: String(book.total) } : EMPTY_BOOK_FORM
  );
  const [errors, setErrors] = useState<Partial<BookForm>>({});

  const set = (k: keyof BookForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Partial<BookForm> = {};
    if (!form.title.trim()) e.title = "Required.";
    if (!form.author.trim()) e.author = "Required.";
    if (!validateISBN(form.isbn)) e.isbn = "Must be 10 or 13 digits.";
    const n = Number(form.total);
    if (!form.total || isNaN(n) || n < 1) e.total = "Must be a positive number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="font-semibold">{book ? "Edit Book" : "Add New Book"}</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"><X size={15} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {(["title", "author"] as const).map((k) => (
            <div key={k}>
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{k}</label>
              <input className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                value={form[k]} onChange={set(k)} placeholder={k === "title" ? "e.g. Noli Me Tangere" : "e.g. José Rizal"} />
              {errors[k] && <p className="text-xs text-red-600 mt-1">{errors[k]}</p>}
            </div>
          ))}
          <div>
            <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">ISBN (10 or 13 digits)</label>
            <input className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 font-mono"
              value={form.isbn} onChange={set("isbn")} placeholder="e.g. 9789710801048" />
            {errors.isbn && <p className="text-xs text-red-600 mt-1">{errors.isbn}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Genre</label>
              <select className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                value={form.genre} onChange={set("genre")}>
                {GENRES_LIST.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Total Copies</label>
              <input type="number" min={1}
                className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                value={form.total} onChange={set("total")} placeholder="e.g. 4" />
              {errors.total && <p className="text-xs text-red-600 mt-1">{errors.total}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-secondary transition-colors">Cancel</button>
          <button onClick={() => { if (validate()) onSave(form); }} className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
            {book ? "Save Changes" : "Add Book"}
          </button>
        </div>
      </div>
    </div>
  );
}
