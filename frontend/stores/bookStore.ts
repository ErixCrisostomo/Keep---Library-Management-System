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
    set({ isLoading: true, error: null });
    try {
      const book = await bookService.create(form);
      set({ books: [...get().books, book], isLoading: false });
      return book;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add book.";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  editBook: async (id, form) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await bookService.update(id, form);
      set({ books: get().books.map((b) => (b.id === id ? updated : b)), isLoading: false });
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update book.";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  deleteBook: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await bookService.remove(id);
      set({ books: get().books.filter((b) => b.id !== id), isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete book.";
      set({ error: message, isLoading: false });
      throw err;
    }
  },
}));
