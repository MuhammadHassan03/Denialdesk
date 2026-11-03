import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppNav } from "./app-nav";
import { LogoMark } from "./logo-mark";

type AppHeaderProps = {
  billerName: string;
  billerInitials: string;
  openDenialCount: number;
};

export function AppHeader({ billerName, billerInitials, openDenialCount }: AppHeaderProps) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-8">
        <Link
          href="/queue"
          className="flex items-center gap-2.5 text-lg font-bold text-ink no-underline hover:text-ink"
        >
          <LogoMark />
          Denialdesk
        </Link>
        <AppNav openDenialCount={openDenialCount} />
        <details className="relative">
          <summary
            aria-label={`Account menu for ${billerName}`}
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-white text-sm font-semibold text-ink transition-colors hover:bg-well [&::-webkit-details-marker]:hidden"
          >
            {billerInitials}
          </summary>
          <div className="absolute top-[calc(100%+8px)] right-0 z-30 flex w-56 animate-pop flex-col gap-1 rounded-2xl border border-line-strong bg-white p-2 shadow-[0_2px_4px_rgba(14,23,38,0.06),0_28px_56px_-20px_rgba(14,23,38,0.35)]">
            <span className="px-2.5 py-2 text-sm text-muted">Signed in as {billerName}</span>
            <SignOutButton className="flex min-h-11 w-full items-center rounded-[10px] px-2.5 text-left text-sm font-semibold text-subtle hover:bg-well" />
          </div>
        </details>
      </div>
    </header>
  );
}
