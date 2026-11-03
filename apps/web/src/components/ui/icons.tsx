// Stroke icons drawn in the current text colour. Decorative: hidden from screen readers,
// so the words next to them always carry the meaning.

type IconProps = {
  size?: number;
  className?: string;
};

const DEFAULT_ICON_SIZE = 18;

export function CheckIcon({ size = DEFAULT_ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

export function CheckCircleIcon({ size = DEFAULT_ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}
