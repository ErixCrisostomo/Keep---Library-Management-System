import { api } from "./api";
import { Book, BookForm } from "@/lib/types";

function toPayload(f: BookForm) {
  return {
    title: f.title,
    author: f.author,
    isbn: f.isbn,
    genre: f.genre,
    total: Number(f.total),
  };
}

export const bookService = {
  list: (params?: { search?: string; genre?: string; availableOnly?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.genre) qs.set("genre", params.genre);
    if (params?.availableOnly) qs.set("available_only", "true");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Book[]>(`/api/books${suffix}`);
  },
  create: (form: BookForm) => api.post<Book>("/api/books", toPayload(form)),
  update: (id: string, form: BookForm) => api.put<Book>(`/api/books/${id}`, toPayload(form)),
  remove: (id: string) => api.delete<void>(`/api/books/${id}`),
};
