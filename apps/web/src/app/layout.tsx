import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Denialdesk",
  description: "Work your denials: rank, draft, review and export.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <nav className="mx-auto flex max-w-6xl gap-6 px-4 py-3 text-sm">
            <span className="font-semibold">Denialdesk</span>
            <Link href="/queue">Queue</Link>
            <Link href="/upload">Upload</Link>
            <Link href="/stats">Stats</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
