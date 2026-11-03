import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
// Letters and policy quotes are set in a serif so they read like the document they become.
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });

export const metadata: Metadata = {
  title: "Denialdesk",
  description: "Work your denials: rank, draft, review and export.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const fontVariables = `${geist.variable} ${geistMono.variable} ${sourceSerif.variable}`;
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-screen bg-canvas font-sans text-ink">{children}</body>
    </html>
  );
}
