"use client";

import { SortOption } from "@/lib/types";

export function SortSelect({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as SortOption)}
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
