type LogoMarkProps = {
  // On the dark brand background the front card is white instead of brand green.
  onDark?: boolean;
  size?: number;
};

const DEFAULT_LOGO_SIZE = 28;

export function LogoMark({ onDark = false, size = DEFAULT_LOGO_SIZE }: LogoMarkProps) {
  const frontCardColor = onDark ? "#FFFFFF" : "#0B6E66";
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="9" y="1" width="18" height="14" rx="4" fill="#9ED3CC" />
      <rect x="5" y="6" width="18" height="14" rx="4" fill="#3E9E93" />
      <rect x="1" y="12" width="18" height="14" rx="4" fill={frontCardColor} />
    </svg>
  );
}
