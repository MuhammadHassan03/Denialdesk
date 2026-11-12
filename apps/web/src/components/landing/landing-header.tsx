import Link from "next/link";
import { LogoMark } from "@/components/ui/logo-mark";

const NAV_LINK_CLASSES =
  "px-3 py-2.5 text-[15px] font-medium text-subtle no-underline transition-colors hover:text-ink";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold text-ink no-underline hover:text-ink"
        >
          <LogoMark />
          Denialdesk
        </Link>
        <nav aria-label="Main" className="hidden flex-auto flex-wrap gap-1 md:flex">
          <a href="#cost" className={NAV_LINK_CLASSES}>
            What waiting costs
          </a>
          <a href="#how" className={NAV_LINK_CLASSES}>
            How it works
          </a>
          <a href="#checks" className={NAV_LINK_CLASSES}>
            The check
          </a>
          <a href="#pilot" className={NAV_LINK_CLASSES}>
            Pricing
          </a>
        </nav>
        <Link href="/login" className={`ml-auto ${NAV_LINK_CLASSES}`}>
          Sign in
        </Link>
        <a
          href="#pilot"
          className="inline-flex min-h-11 items-center rounded-md bg-brand px-[18px] text-[15px] font-bold text-white no-underline transition-colors hover:bg-brand-dark hover:text-white"
        >
          Book a pilot
        </a>
      </div>
    </header>
  );
}
