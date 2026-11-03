import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-1.5">
          <span className="font-bold">Denialdesk</span>
          <span className="text-sm text-muted">
            Pilots run on de-identified data until a business associate agreement is signed.
          </span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-5 text-sm">
          <Link href="/login">Sign in</Link>
          <span className="text-muted">Built by Muhammad Hassan</span>
        </nav>
      </div>
    </footer>
  );
}
