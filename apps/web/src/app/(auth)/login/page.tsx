import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMessage } from "@/components/auth/form-message";
import { LoginForm } from "@/components/auth/login-form";
import { safePathAfterLogin } from "@/lib/login-rules";
import { checkSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Sign in to Denialdesk",
};

const NOTICE_BY_REASON: Record<string, string> = {
  idle: "You were signed out after 30 minutes of inactivity.",
  password_set: "Your password is set. Sign in to continue.",
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = firstValue(params.next);
  const reason = firstValue(params.reason);

  const sessionCheck = await checkSession();
  if (sessionCheck.signedIn) {
    redirect(safePathAfterLogin(nextPath));
  }

  let notice: string | null = null;
  if (reason !== null) {
    notice = NOTICE_BY_REASON[reason] ?? null;
  }

  return (
    <>
      <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em]">Sign in</h1>
      {notice === null ? null : <FormMessage tone="notice" message={notice} />}
      <LoginForm nextPath={nextPath} />
    </>
  );
}
