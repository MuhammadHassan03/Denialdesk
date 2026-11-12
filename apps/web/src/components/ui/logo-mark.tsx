type LogoMarkProps = {
  // On the dark brand background the front card is white instead of ballpoint blue.
  onDark?: boolean;
  size?: number;
};

const DEFAULT_LOGO_SIZE = 28;

export function LogoMark({ onDark = false, size = DEFAULT_LOGO_SIZE }: LogoMarkProps) {
  const frontCardColor = onDark ? "#FFFFFF" : "#1F3FA6";
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="9" y="1" width="18" height="14" rx="4" fill="#A9B9EA" />
      <rect x="5" y="6" width="18" height="14" rx="4" fill="#5B77CF" />
      <rect x="1" y="12" width="18" height="14" rx="4" fill={frontCardColor} />
    </svg>
  );
}
