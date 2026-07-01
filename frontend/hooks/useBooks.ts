"use client";

import { useEffect } from "react";
import { useBookStore } from "@/stores/bookStore";

export function useBooks() {
  const { books, isLoading, error, fetchBooks, addBook, editBook, deleteBook } = useBookStore();

  useEffect(() => {
    fetchBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { books, isLoading, error, fetchBooks, addBook, editBook, deleteBook };
}
