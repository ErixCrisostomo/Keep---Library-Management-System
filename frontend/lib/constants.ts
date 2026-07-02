export const GENRES_LIST = [
  "Fiction", "Dystopian", "Poetry", "Science", "History",
  "Technology", "Philosophy", "Economics", "Psychology",
];
export const ALL_GENRES = ["All", ...GENRES_LIST];

export const PER_PAGE = 10;

// Higher-contrast autumn palette — each genre gets a warm background, dark text, and a strong border.
export const GENRE_COLORS: Record<string, string> = {
  Fiction: "bg-amber-100 text-amber-950 border-amber-500",
  Dystopian: "bg-stone-200 text-stone-950 border-stone-600",
  Poetry: "bg-rose-100 text-rose-950 border-rose-500",
  Science: "bg-emerald-100 text-emerald-950 border-emerald-600",
  History: "bg-yellow-200 text-yellow-950 border-yellow-600",
  Technology: "bg-orange-100 text-orange-950 border-orange-500",
  Philosophy: "bg-emerald-200 text-emerald-950 border-emerald-700",
  Economics: "bg-red-100 text-red-950 border-red-500",
  Psychology: "bg-orange-200 text-orange-950 border-orange-600",
};

export const EMPTY_BOOK_FORM = { title: "", author: "", isbn: "", genre: "Fiction", total: "" };

export function validateISBN(isbn: string) {
  const c = isbn.replace(/[-\s]/g, "");
  return c.length === 10 || c.length === 13;
}
