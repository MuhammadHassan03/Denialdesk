import Link from "next/link";
import { LogoMark } from "@/components/ui/logo-mark";

const NAV_LINK_CLASSES =
  "px-3 py-2.5 text-[15px] font-medium text-[#D5EEEA] no-underline transition-colors hover:text-white";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/12 bg-brand-night/82 backdrop-blur-[14px]">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-7 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold text-white no-underline hover:text-white"
        >
          <LogoMark onDark />
          Denialdesk
        </Link>
        <nav aria-label="Main" className="flex flex-auto flex-wrap gap-1">
          <a href="#how" className={NAV_LINK_CLASSES}>
            How it works
          </a>
          <a href="#checks" className={NAV_LINK_CLASSES}>
            Safety checks
          </a>
          <a href="#pilot" className={NAV_LINK_CLASSES}>
            Pricing
          </a>
        </nav>
        <Link
          href="/login"
          className="px-3 py-2.5 text-[15px] font-semibold text-white no-underline transition-colors hover:text-brand-mist"
        >
          Sign in
        </Link>
        <a
          href="#pilot"
          className="inline-flex min-h-11 items-center rounded-xl bg-white px-[18px] text-[15px] font-bold text-brand-night no-underline transition hover:-translate-y-0.5 hover:bg-brand-mist hover:text-brand-night"
        >
          Book a pilot
        </a>
      </div>
    </header>
  );
}
