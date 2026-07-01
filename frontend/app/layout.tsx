import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keep — Library Management System",
  description: "Library management system for Librarians and Students",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
