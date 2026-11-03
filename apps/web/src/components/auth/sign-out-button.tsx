import { signOut } from "@/server/actions/auth";

type SignOutButtonProps = {
  className?: string;
};

// A plain form, so signing out works by keyboard and even before JavaScript loads.
export function SignOutButton({ className = "" }: SignOutButtonProps) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={`text-sm font-semibold text-muted hover:text-ink ${className}`}
      >
        Sign out
      </button>
    </form>
  );
}
