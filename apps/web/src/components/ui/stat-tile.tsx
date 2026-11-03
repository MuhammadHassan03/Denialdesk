import type { ReactNode } from "react";

// A number tile with a solid offset shadow behind it, as on the queue and stats screens.

type StatTileTone = "slate" | "brand" | "good" | "warn";

const SHADOW_CLASSES: Record<StatTileTone, string> = {
  slate: "bg-slate-shadow",
  brand: "bg-brand-shadow",
  good: "bg-good-shadow",
  warn: "bg-warn-shadow",
};

const VALUE_CLASSES: Record<StatTileTone, string> = {
  slate: "text-ink",
  brand: "text-brand",
  good: "text-good",
  warn: "text-warn",
};

type StatTileProps = {
  label: string;
  value: string;
  tone: StatTileTone;
  note?: ReactNode;
};

export function StatTile({ label, value, tone, note }: StatTileProps) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className={`absolute inset-0 translate-2 rounded-[18px] ${SHADOW_CLASSES[tone]}`}
      />
      <div className="relative flex flex-col gap-1.5 rounded-[18px] border border-line bg-white px-6 py-5 shadow-[0_1px_2px_rgba(14,23,38,0.06),0_16px_32px_-16px_rgba(14,23,38,0.18)]">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span
          className={`font-mono text-[34px] font-semibold tracking-[-0.02em] ${VALUE_CLASSES[tone]}`}
        >
          {value}
        </span>
        {note === undefined ? null : <span className="text-[13px] text-muted">{note}</span>}
      </div>
    </div>
  );
}
