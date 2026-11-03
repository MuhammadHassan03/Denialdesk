import { CheckCircleIcon, WarningIcon } from "@/components/ui/icons";
import { summarizeRules, type RuleOutcome } from "@/lib/rules-summary";
import type { SuggestedAction } from "@/lib/suggested-action";

type LetterBlock = {
  role: "subject" | "reference" | "body" | "note" | "signoff";
  segments: { text: string; isPolicyQuote: boolean }[];
};

export type DraftPanelDraft = {
  kind: "appeal_letter" | "corrected_claim";
  version: number;
  author: "ai" | "biller";
  letter: LetterBlock[];
  checks: { name: string; result: RuleOutcome; reason: string }[];
};

type DraftPanelProps = {
  draft: DraftPanelDraft | null;
  suggestedAction: SuggestedAction;
  isManual: boolean;
  needsCheck: boolean;
};

const BLOCK_CLASSES: Record<LetterBlock["role"], string> = {
  subject: "font-semibold",
  reference: "text-sm text-muted",
  body: "",
  note: "text-sm text-muted",
  signoff: "whitespace-pre-line",
};

const SUMMARY_CLASSES: Record<RuleOutcome, string> = {
  pass: "bg-good-soft text-good-dark",
  warn: "bg-good-soft text-good-dark",
  fail: "bg-bad-soft text-bad-dark",
};

const SECONDARY_BUTTON =
  "min-h-11 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-semibold text-subtle transition-colors hover:bg-well disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-white";

function writeButtonLabel(action: SuggestedAction): string {
  if (action === "appeal") {
    return "Write appeal";
  }
  if (action === "fix") {
    return "Write corrected claim";
  }
  return "Write draft";
}

function NoDraft({ suggestedAction, isManual, needsCheck }: Omit<DraftPanelProps, "draft">) {
  if (isManual) {
    return (
      <p className="m-0 rounded-[14px] border border-dashed border-faint p-4 text-sm leading-normal text-subtle">
        Denialdesk doesn&rsquo;t draft for this code yet. Work it in your usual way, then mark it as
        submitted or written off.
      </p>
    );
  }
  if (needsCheck) {
    return (
      <p className="m-0 rounded-[14px] bg-warn-soft p-4 text-sm leading-normal text-warn-dark">
        Confirm the details read from the PDF before a draft can be written.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-dashed border-line-strong bg-well p-4">
      <p className="m-0 text-sm text-muted">
        No draft yet. Drafting isn&rsquo;t connected yet, so this button stays off for now.
      </p>
      <button
        type="button"
        disabled
        className="min-h-11 rounded-xl bg-brand px-5 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {writeButtonLabel(suggestedAction)}
      </button>
    </div>
  );
}

export function DraftPanel({ draft, suggestedAction, isManual, needsCheck }: DraftPanelProps) {
  const title = draft?.kind === "corrected_claim" ? "Corrected claim" : "Appeal letter";
  return (
    <section
      aria-labelledby="draft-heading"
      className="flex flex-col gap-[18px] rounded-[20px] border border-line bg-white px-7 py-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="draft-heading" className="m-0 text-lg font-semibold">
          {draft === null ? "Draft" : title}
          {draft === null ? null : (
            <span className="text-sm font-medium text-muted">
              {" "}
              · version {draft.version}, written by {draft.author === "ai" ? "AI" : "you"}
            </span>
          )}
        </h2>
        {draft === null ? null : (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled className={SECONDARY_BUTTON}>
              Compare versions
            </button>
            <button type="button" disabled className={SECONDARY_BUTTON}>
              Regenerate
            </button>
          </div>
        )}
      </div>

      {draft === null ? (
        <NoDraft suggestedAction={suggestedAction} isManual={isManual} needsCheck={needsCheck} />
      ) : (
        <DraftBody draft={draft} />
      )}
    </section>
  );
}

function DraftBody({ draft }: { draft: DraftPanelDraft }) {
  const summary = summarizeRules(draft.checks);
  return (
    <>
      <div
        role="status"
        className={`flex animate-pop flex-wrap items-center gap-3 rounded-[14px] px-4 py-3.5 text-sm ${SUMMARY_CLASSES[summary.overall]}`}
      >
        {summary.overall === "fail" ? <WarningIcon size={20} /> : <CheckCircleIcon size={20} />}
        <span className="font-semibold">{summary.headline}</span>
        {summary.warningText === null ? null : <span>{summary.warningText}</span>}
      </div>

      {/* Two offset sheets behind the letter make it read as a paper document. */}
      <div className="relative pr-3.5 pb-3.5">
        <div
          aria-hidden="true"
          className="absolute top-3.5 right-0 bottom-0 left-3.5 rounded-[14px] border border-[#DDE1E6] bg-[#E9ECF0]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-[7px] rounded-[14px] border border-line bg-[#F2F4F6]"
        />
        <article
          aria-label="Draft"
          className="relative flex flex-col gap-3.5 rounded-[14px] border border-line-strong bg-white px-6 py-8 font-serif text-base leading-[1.65] text-ink-soft shadow-[0_18px_36px_-20px_rgba(14,23,38,0.28)] sm:px-9"
        >
          {draft.letter.map((block, blockIndex) => (
            <p key={blockIndex} className={`m-0 ${BLOCK_CLASSES[block.role]}`}>
              {block.segments.map((segment, segmentIndex) => {
                if (segment.isPolicyQuote) {
                  return (
                    <mark key={segmentIndex} className="bg-brand-soft px-0.5 text-inherit">
                      {segment.text}
                    </mark>
                  );
                }
                return <span key={segmentIndex}>{segment.text}</span>;
              })}
            </p>
          ))}
        </article>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {summary.overall === "warn" ? (
          <label className="inline-flex min-h-11 items-center gap-2.5 text-sm">
            <input type="checkbox" className="size-[18px] accent-brand" />
            I&rsquo;ve reviewed the warning
          </label>
        ) : (
          <span />
        )}
        <button type="button" disabled className={SECONDARY_BUTTON}>
          Save changes
        </button>
      </div>
    </>
  );
}
