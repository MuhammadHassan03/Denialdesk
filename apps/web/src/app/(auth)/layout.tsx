import type { ReactNode } from "react";
import { AuthShowcase } from "@/components/auth/auth-showcase";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-wrap bg-canvas text-ink">
      <AuthShowcase />
      <main className="flex flex-[1_1_440px] items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-[400px] flex-col gap-[18px] rounded-3xl border border-line bg-white p-7 shadow-[0_1px_2px_rgba(14,23,38,0.06),0_30px_60px_-30px_rgba(14,23,38,0.25)] sm:p-9">
          {children}
          <p className="m-0 text-[13px] leading-normal text-muted">
            For safety, you&apos;re signed out after 30 minutes without activity.
          </p>
        </div>
      </main>
    </div>
  );
}
