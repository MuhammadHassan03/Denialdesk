import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/auth/form-message";
import { SetupPasswordForm } from "@/components/auth/setup-password-form";

export const metadata: Metadata = {
  title: "Set your Denialdesk password",
};

type SetupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// The token is checked when the form is sent, so an expired link shows its message there.
export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = await searchParams;
  const setupToken = typeof params.token === "string" ? params.token : null;

  if (setupToken === null || setupToken === "") {
    return (
      <>
        <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em]">Set your password</h1>
        <FormMessage tone="error" message="This link has expired. Ask for a new one." />
        <Link href="/login" className="text-sm font-semibold">
          Go to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em]">Set your password</h1>
        <p className="m-0 text-[15px] text-muted">
          Choose the password you&apos;ll use to sign in. This link works once.
        </p>
      </div>
      <SetupPasswordForm setupToken={setupToken} />
    </>
  );
}
