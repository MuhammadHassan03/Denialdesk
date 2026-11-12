"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { defaultSuggestedAction, denialCodeShortMeaning } from "@/lib/denial-codes";
import { formatCents } from "@/lib/money";
import { suggestedActionLabel } from "@/lib/suggested-action";

// Four claims from the synthetic 835 in fixtures/synthetic. Days left are made up for the demo.
type RemittanceClaim = {
  claimSegment: string;
  adjustmentSegment: string;
  code: string;
  claimNumber: string;
  amountCents: number;
  daysLeft: number;
};

const CLAIMS: RemittanceClaim[] = [
  {
    claimSegment: "CLP*PCN1002*4*1200*0**12*PCCN0002",
    adjustmentSegment: "CAS*CO*197*1200",
    code: "CO-197",
    claimNumber: "PCN1002",
    amountCents: 120000,
    daysLeft: 6,
  },
  {
    claimSegment: "CLP*PCN1004*1*400*0**12*PCCN0004",
    adjustmentSegment: "CAS*CO*50*400",
    code: "CO-50",
    claimNumber: "PCN1004",
    amountCents: 40000,
    daysLeft: 19,
  },
  {
    claimSegment: "CLP*PCN1005*4*250*0**12*PCCN0005",
    adjustmentSegment: "CAS*CO*29*250",
    code: "CO-29",
    claimNumber: "PCN1005",
    amountCents: 25000,
    daysLeft: 41,
  },
  {
    claimSegment: "CLP*PCN1001*1*600*300**12*PCCN0001",
    adjustmentSegment: "CAS*CO*4*200",
    code: "CO-4",
    claimNumber: "PCN1001",
    amountCents: 20000,
    daysLeft: 62,
  },
];

const URGENT_DAYS = 7;

function daysLeftWords(daysLeft: number): string {
  if (daysLeft === 1) {
    return "1 day left to appeal";
  }
  return `${daysLeft} days left to appeal`;
}

// The page's one demonstration: pick a line of the raw file and read what it means.
export function RemittanceDecoder() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const selected = CLAIMS[selectedIndex] ?? CLAIMS[0];
  if (selected === undefined) {
    return null;
  }
  const isUrgent = selected.daysLeft <= URGENT_DAYS;
  const slideDistance = prefersReducedMotion ? 0 : 10;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-0">
      <div className="rounded-md border border-line-strong bg-paper lg:rounded-r-none lg:border-r-0">
        <p className="m-0 border-b border-line px-4 py-2.5 text-[13px] font-semibold text-muted">
          What the payer sent: remit_1015.835
        </p>
        <ul className="m-0 flex list-none flex-col p-2 font-mono text-[13px] leading-snug sm:text-sm">
          {CLAIMS.map((claim, index) => {
            const isSelected = index === selectedIndex;
            return (
              <li key={claim.claimNumber}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedIndex(index)}
                  className={`flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-sm border-0 px-2.5 py-2 text-left font-mono transition-colors ${isSelected ? "bg-brand-tint text-ink" : "bg-transparent text-muted hover:bg-well"}`}
                >
                  <span className="break-all">{claim.claimSegment}~</span>
                  <span className="relative break-all">
                    {isSelected ? (
                      <motion.span
                        layoutId="marker-stroke"
                        aria-hidden="true"
                        className="absolute -inset-x-1 inset-y-0 bg-marker"
                        transition={{ type: "spring", stiffness: 420, damping: 38 }}
                      />
                    ) : null}
                    <span className="relative font-medium">{claim.adjustmentSegment}~</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div aria-live="polite" className="rounded-md border-2 border-ink bg-paper lg:rounded-l-none">
        <p className="m-0 border-b border-line px-5 py-2.5 text-[13px] font-semibold text-muted">
          What it means
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected.claimNumber}
            initial={{ opacity: 0, y: slideDistance }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -slideDistance }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="flex flex-col gap-4 px-5 py-5"
          >
            <p className="display m-0 text-[34px] text-ink sm:text-[40px]">
              {denialCodeShortMeaning(selected.code)}
            </p>
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3 text-[15px]">
              <div>
                <dt className="text-[13px] text-muted">At stake</dt>
                <dd className="m-0 text-xl font-bold">
                  <span className="marker">{formatCents(selected.amountCents)}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Deadline</dt>
                <dd className={`m-0 text-xl font-bold ${isUrgent ? "text-form" : "text-ink"}`}>
                  {daysLeftWords(selected.daysLeft)}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Claim</dt>
                <dd className="m-0 font-mono">{selected.claimNumber}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Suggested next step</dt>
                <dd className="m-0 font-semibold text-brand">
                  {suggestedActionLabel(defaultSuggestedAction(selected.code))}
                </dd>
              </div>
            </dl>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
