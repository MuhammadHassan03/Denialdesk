type DecisionBarProps = {
  isClosed: boolean;
  hasDraft: boolean;
};

const SECONDARY_BUTTON =
  "min-h-12 rounded-xl border border-line-strong bg-white px-[18px] text-[15px] font-semibold text-subtle transition-colors hover:bg-well disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-white";
const PRIMARY_BUTTON =
  "min-h-12 rounded-xl bg-brand px-6 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_-8px_rgba(11,110,102,0.6)] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

// Always visible on scroll (F9). The approve, reject and write-off actions are not
// connected yet, so every button is off and the note says why.
export function DecisionBar({ isClosed, hasDraft }: DecisionBarProps) {
  let note = "Nothing is sent until you approve. Approved work can be exported as PDF or Word.";
  if (!hasDraft) {
    note = "Decisions open up once there's a draft to review.";
  }
  if (isClosed) {
    note = "This denial is closed. Reopen it to work on it again.";
  }
  return (
    <div className="sticky bottom-0 z-10 border-t border-line bg-white/92 shadow-[0_-12px_32px_-16px_rgba(14,23,38,0.2)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
        <span className="text-sm text-muted">{note}</span>
        <div className="flex flex-wrap gap-2.5">
          {isClosed ? (
            <button type="button" disabled className={SECONDARY_BUTTON}>
              Reopen
            </button>
          ) : (
            <>
              <button type="button" disabled className={SECONDARY_BUTTON}>
                Write off
              </button>
              <button type="button" disabled className={SECONDARY_BUTTON}>
                Reject draft
              </button>
              <button type="button" disabled className={PRIMARY_BUTTON}>
                Approve draft
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
