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

type StrokeIconProps = IconProps & { path: string; strokeWidth?: string };

function StrokeIcon({
  size = DEFAULT_ICON_SIZE,
  className,
  path,
  strokeWidth = "2",
}: StrokeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return <StrokeIcon {...props} path="M12 16V4M6 10l6-6 6 6M4 20h16" />;
}

export function ChevronDownIcon(props: IconProps) {
  return <StrokeIcon {...props} path="M6 9l6 6 6-6" />;
}

export function ChevronLeftIcon(props: IconProps) {
  return <StrokeIcon {...props} path="M15 6l-6 6 6 6" />;
}

export function CloseIcon(props: IconProps) {
  return <StrokeIcon {...props} strokeWidth="2.2" path="M6 6l12 12M18 6L6 18" />;
}

export function WarningIcon(props: IconProps) {
  return (
    <StrokeIcon
      {...props}
      strokeWidth="2.2"
      path="M12 8v5M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
    />
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <StrokeIcon
      {...props}
      strokeWidth="2.2"
      path="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2"
    />
  );
}
