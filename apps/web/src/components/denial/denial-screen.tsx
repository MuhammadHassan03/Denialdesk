import type { DenialPageView } from "@/server/views/denial-view";
import { DecisionBar } from "./decision-bar";
import { DenialNavigation, ClaimSummary } from "./denial-summary";
import { HistoryList, PolicyCard, RulesCheckList, TimeOnDenial } from "./denial-sidebar";
import { DraftPanel } from "./draft-panel";
import { FactsPanel } from "./facts-panel";
import { PayerReasons } from "./payer-reasons";

type DenialScreenProps = {
  denial: DenialPageView;
};

// One denial, top to bottom as F5 lays it out. Shared by the real page and the design preview.
export function DenialScreen({ denial }: DenialScreenProps) {
  const isManual = denial.status === "manual";
  const needsCheck = denial.status === "needs_check";
  return (
    <>
      <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 pt-6 pb-8 sm:px-8">
        {denial.isPreview ? (
          <p
            role="note"
            className="m-0 rounded-[14px] border border-dashed border-warn bg-warn-soft px-4 py-3 text-sm font-semibold text-warn-dark"
          >
            Design preview with synthetic data. Nothing here is a real claim.
          </p>
        ) : null}
        <DenialNavigation {...denial.navigation} />
        {needsCheck ? (
          <p
            role="note"
            className="m-0 rounded-[14px] bg-warn-soft px-4 py-3 text-sm text-warn-dark"
          >
            These details were read from a PDF ({denial.sourceFilename}). Check them against the
            document before drafting.
          </p>
        ) : null}
        <div className="animate-rise">
          <ClaimSummary
            headline={denial.headline}
            status={denial.status}
            payerName={denial.payerName}
            claimNumber={denial.claimNumber}
            payerClaimControlNumber={denial.payerClaimControlNumber}
            serviceDate={denial.serviceDate}
            amountAtStakeCents={denial.amountAtStakeCents}
            appealDeadline={denial.appealDeadline}
            deadlineIsEstimate={denial.deadlineIsEstimate}
            today={denial.today}
          />
        </div>

        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[999_1_640px] animate-rise flex-col gap-6 [animation-delay:80ms]">
            <PayerReasons
              reasons={denial.reasons}
              serviceLine={denial.serviceLine}
              otherDenialsOnClaim={denial.otherDenialsOnClaim}
            />
            <FactsPanel
              question={isManual ? null : denial.factsQuestion}
              answers={denial.factsAnswers}
              suggestedAction={denial.suggestedAction}
              suggestedActionReason={denial.suggestedActionReason}
              isReadOnly={denial.isClosed || needsCheck}
            />
            <DraftPanel
              draft={denial.draft}
              suggestedAction={denial.suggestedAction}
              isManual={isManual}
              needsCheck={needsCheck}
            />
          </div>

          <aside
            aria-label="Details"
            className="flex min-w-0 flex-[1_1_340px] animate-rise flex-col gap-6 [animation-delay:160ms]"
          >
            <PolicyCard
              payerName={denial.payerName}
              code={denial.code}
              policies={denial.policies}
            />
            <RulesCheckList checks={denial.draft?.checks ?? []} />
            <TimeOnDenial activeSeconds={denial.activeSeconds} />
            <HistoryList items={denial.history} />
          </aside>
        </div>
      </main>
      <DecisionBar isClosed={denial.isClosed} hasDraft={denial.draft !== null} />
    </>
  );
}
