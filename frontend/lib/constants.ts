export const GENRES_LIST = [
  "Fiction", "Dystopian", "Poetry", "Science", "History",
  "Technology", "Philosophy", "Economics", "Psychology",
];
export const ALL_GENRES = ["All", ...GENRES_LIST];

export const GENRE_COLORS: Record<string, string> = {
  Fiction: "bg-amber-50 text-amber-800 border-amber-200",
  Dystopian: "bg-stone-100 text-stone-700 border-stone-300",
  Poetry: "bg-rose-50 text-rose-800 border-rose-200",
  Science: "bg-sky-50 text-sky-800 border-sky-200",
  History: "bg-yellow-50 text-yellow-800 border-yellow-200",
  Technology: "bg-orange-50 text-orange-800 border-orange-200",
  Philosophy: "bg-lime-50 text-lime-800 border-lime-200",
  Economics: "bg-red-50 text-red-800 border-red-200",
  Psychology: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200",
};

export const EMPTY_BOOK_FORM = { title: "", author: "", isbn: "", genre: "Fiction", total: "" };

export function validateISBN(isbn: string) {
  const c = isbn.replace(/[-\s]/g, "");
  return c.length === 10 || c.length === 13;
}
