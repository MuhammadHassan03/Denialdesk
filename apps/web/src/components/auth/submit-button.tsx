type SubmitButtonProps = {
  label: string;
  pendingLabel: string;
  isPending: boolean;
  disabled?: boolean;
};

export function SubmitButton({
  label,
  pendingLabel,
  isPending,
  disabled = false,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isPending || disabled}
      aria-disabled={isPending || disabled}
      className="min-h-12 rounded-xl bg-brand px-4 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_-8px_rgba(11,110,102,0.6)] transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}
