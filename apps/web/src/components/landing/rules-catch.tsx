"use client";

import { useState } from "react";

const POLICY_SENTENCE =
  "Services performed within the approved authorization period are eligible for payment.";
const INVENTED_SENTENCE = "All authorized services are always paid in full without review.";

type DraftVersion = {
  label: string;
  quote: string;
  quoteIsReal: boolean;
};

const DRAFT_VERSIONS: DraftVersion[] = [
  { label: "Draft 1", quote: INVENTED_SENTENCE, quoteIsReal: false },
  { label: "Draft 2", quote: POLICY_SENTENCE, quoteIsReal: true },
];

// Shows the product failing its own draft. Synthetic letter, synthetic policy.
export function RulesCatch() {
  const [versionIndex, setVersionIndex] = useState(0);
  const version = DRAFT_VERSIONS[versionIndex] ?? DRAFT_VERSIONS[0];
  if (version === undefined) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
      <div className="rounded-md border border-line-strong bg-paper">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-2.5">
          <div role="group" aria-label="Draft version" className="flex gap-1">
            {DRAFT_VERSIONS.map((draftVersion, index) => (
              <button
                key={draftVersion.label}
                type="button"
                aria-pressed={index === versionIndex}
                onClick={() => setVersionIndex(index)}
                className={`min-h-9 cursor-pointer rounded-sm border px-3 text-sm font-semibold transition-colors ${index === versionIndex ? "border-ink bg-ink text-white" : "border-line-strong bg-paper text-subtle hover:bg-well"}`}
              >
                {draftVersion.label}
              </button>
            ))}
          </div>
          <span className="text-[13px] text-muted">Appeal letter, CO-197</span>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5 font-serif text-[17px] leading-[1.7] text-ink">
          <p className="m-0 font-bold">Re: Appeal of claim PCCN0002</p>
          <p className="m-0">
            Authorization AUTH-88213 was issued on August 20, 2026, before the service. Your policy
            SHP-PA-01 states:{" "}
            <span
              className={
                version.quoteIsReal
                  ? "bg-good-soft"
                  : "bg-form-soft underline decoration-form decoration-wavy underline-offset-4"
              }
            >
              &ldquo;{version.quote}&rdquo;
            </span>
          </p>
          <p className="m-0">Please reprocess the claim and issue payment.</p>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-col gap-4">
        <ul className="m-0 flex list-none flex-col border-t border-line-strong p-0">
          <li className="flex flex-col gap-0.5 border-b border-line-strong py-3">
            <span className="font-semibold text-good">Passed: claim references correct</span>
          </li>
          <li className="flex flex-col gap-0.5 border-b border-line-strong py-3">
            <span className="font-semibold text-good">Passed: citation exists</span>
          </li>
          <li className="flex flex-col gap-1 border-b border-line-strong py-3">
            {version.quoteIsReal ? (
              <span className="font-semibold text-good">Passed: quotes are real</span>
            ) : (
              <>
                <span className="font-bold text-form">Failed: quotes are real</span>
                <span className="text-[15px] text-subtle">
                  This quote isn&rsquo;t in policy SHP-PA-01 word for word.
                </span>
              </>
            )}
          </li>
        </ul>
        <p
          className={`m-0 rounded-md border-2 px-4 py-3 text-base font-bold ${version.quoteIsReal ? "border-brand text-brand" : "border-line-strong text-muted"}`}
        >
          {version.quoteIsReal
            ? "Approve is available. The decision is still yours."
            : "Approve is blocked until this is fixed."}
        </p>
        <p className="m-0 text-[15px] leading-relaxed text-muted">
          {version.quoteIsReal
            ? "The second draft was requested automatically, with the failure as the reason. Both versions stay in the history."
            : "The writer made up a sentence and put it in quotation marks. Open Draft 2 to see what happens next."}
        </p>
      </div>
    </div>
  );
}
