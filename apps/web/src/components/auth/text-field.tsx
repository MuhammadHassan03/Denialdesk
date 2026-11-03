import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  // Help shown under the input, e.g. the password rule. Linked for screen readers.
  hint?: string;
  hasError?: boolean;
};

export function TextField({ id, label, hint, hasError = false, ...inputProps }: TextFieldProps) {
  const hintId = `${id}-hint`;
  const borderClass = hasError ? "border-bad" : "border-line-strong";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint === undefined ? undefined : hintId}
        aria-invalid={hasError}
        className={`min-h-12 rounded-xl border ${borderClass} bg-white px-3.5 text-[15px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus-visible:outline-2 focus-visible:outline-brand`}
        {...inputProps}
      />
      {hint === undefined ? null : (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
