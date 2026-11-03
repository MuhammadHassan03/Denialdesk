type ProgressBarProps = {
  label: string;
};

// Server actions don't report upload bytes, so this bar shows activity, not a percentage.
export function ProgressBar({ label }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      className="h-2 overflow-hidden rounded-full bg-line-soft"
    >
      <div className="h-full w-full animate-pulse rounded-full bg-brand motion-reduce:animate-none motion-reduce:opacity-60" />
    </div>
  );
}
