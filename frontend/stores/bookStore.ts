import { create } from "zustand";
import { Book, BookForm } from "@/lib/types";
import { bookService } from "@/services/bookService";

interface BookState {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  fetchBooks: () => Promise<void>;
  addBook: (form: BookForm) => Promise<void>;
  editBook: (id: string, form: BookForm) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
}

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  isLoading: false,
  error: null,

  fetchBooks: async () => {
    set({ isLoading: true, error: null });
    try {
      const books = await bookService.list();
      set({ books, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load books.", isLoading: false });
    }
  },

  addBook: async (form) => {
    const book = await bookService.create(form);
    set({ books: [...get().books, book] });
  },

  editBook: async (id, form) => {
    const updated = await bookService.update(id, form);
    set({ books: get().books.map((b) => (b.id === id ? updated : b)) });
  },

  deleteBook: async (id) => {
    await bookService.remove(id);
    set({ books: get().books.filter((b) => b.id !== id) });
  },
}));
