"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavProps = {
  openDenialCount: number;
};

const LINK_CLASSES =
  "flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[15px] no-underline transition-colors";
const CURRENT_CLASSES = "bg-brand-soft font-semibold text-brand hover:text-brand";
const OTHER_CLASSES = "font-medium text-subtle hover:bg-well hover:text-ink";

function linkClasses(isCurrent: boolean): string {
  if (isCurrent) {
    return `${LINK_CLASSES} ${CURRENT_CLASSES}`;
  }
  return `${LINK_CLASSES} ${OTHER_CLASSES}`;
}

// Client-only so the shared layout can highlight the page the biller is on.
export function AppNav({ openDenialCount }: AppNavProps) {
  const pathname = usePathname();
  // A denial page belongs to the queue.
  const isQueue = pathname.startsWith("/queue") || pathname.startsWith("/denials");
  const isUpload = pathname.startsWith("/upload");
  const isStats = pathname.startsWith("/stats");
  const countClasses = isQueue ? "bg-brand text-white" : "bg-line-soft text-subtle";

  return (
    <nav aria-label="Main" className="flex flex-auto flex-wrap gap-1">
      <Link
        href="/queue"
        aria-current={isQueue ? "page" : undefined}
        className={linkClasses(isQueue)}
      >
        Queue
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${countClasses}`}
          aria-label={`${openDenialCount} open denials`}
        >
          {openDenialCount}
        </span>
      </Link>
      <Link
        href="/upload"
        aria-current={isUpload ? "page" : undefined}
        className={linkClasses(isUpload)}
      >
        Upload
      </Link>
      <Link
        href="/stats"
        aria-current={isStats ? "page" : undefined}
        className={linkClasses(isStats)}
      >
        Stats
      </Link>
    </nav>
  );
}
