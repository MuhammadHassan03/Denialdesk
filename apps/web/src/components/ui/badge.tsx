import type { ReactNode } from "react";

type BadgeTone = "neutral" | "warning" | "danger" | "success";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-900",
  success: "bg-green-100 text-green-900",
};

type BadgeProps = {
  tone: BadgeTone;
  children: ReactNode;
};

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
