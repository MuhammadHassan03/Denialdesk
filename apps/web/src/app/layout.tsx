import type { Metadata } from "next";
import type { ReactNode } from "react";
// Fonts are self-hosted packages, so a build never depends on a font service being reachable.
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/public-sans";
import "@fontsource-variable/source-serif-4";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
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
      <body className="min-h-screen bg-canvas font-sans text-ink">{children}</body>
    </html>
  );
}
