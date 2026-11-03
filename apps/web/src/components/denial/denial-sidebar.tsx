import { CheckIcon, WarningIcon } from "@/components/ui/icons";
import { formatIsoDate } from "@/lib/dates";
import type { RuleOutcome } from "@/lib/rules-summary";

type PolicyCardProps = {
  payerName: string;
  code: string;
  policies: {
    policyId: string;
    topic: string;
    effectiveDate: string;
    quote: string;
    sourceUrl: string;
  }[];
};

// The payer policy used, always with its source and effective date (F5).
export function PolicyCard({ payerName, code, policies }: PolicyCardProps) {
  return (
    <section aria-labelledby="policy-heading" className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-2 rounded-[20px] bg-brand-shadow"
      />
      <div className="relative flex flex-col gap-2.5 rounded-[20px] border border-line bg-white px-6 py-[22px] shadow-[0_1px_2px_rgba(14,23,38,0.06),0_16px_32px_-16px_rgba(14,23,38,0.18)]">
        <h2 id="policy-heading" className="m-0 text-base font-semibold">
          Payer policy used
        </h2>
        {policies.length === 0 ? (
          <p className="m-0 text-sm leading-normal text-muted">
            We don&rsquo;t have {payerName}&rsquo;s policy for {code} yet. The draft will rely on
            general rules and will be marked for extra care.
          </p>
        ) : null}
        {policies.map((policy) => (
          <div key={policy.policyId} className="flex flex-col gap-2.5">
            <p className="m-0 text-sm text-muted">
              {payerName} · {policy.topic} · {policy.policyId} · effective{" "}
              {formatIsoDate(policy.effectiveDate)}
            </p>
            <blockquote className="m-0 rounded-xl bg-brand-tint px-3.5 py-3 font-serif text-[15px] leading-[1.55] text-ink-soft">
              &ldquo;{policy.quote}&rdquo;
            </blockquote>
            <a
              href={policy.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold"
            >
              View the source document
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

const CHECK_PREFIX: Record<RuleOutcome, string> = {
  pass: "Passed",
  warn: "Warning",
  fail: "Problem",
};

type RulesCheckListProps = {
  checks: { name: string; result: RuleOutcome; reason: string }[];
};

export function RulesCheckList({ checks }: RulesCheckListProps) {
  return (
    <section
      aria-labelledby="rules-heading"
      className="flex flex-col gap-3 rounded-[20px] border border-line bg-white px-6 py-[22px]"
    >
      <h2 id="rules-heading" className="m-0 text-base font-semibold">
        Rules check
      </h2>
      {checks.length === 0 ? (
        <p className="m-0 text-sm text-muted">
          The rules check runs on every draft before you see it.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
          {checks.map((check) => (
            <li
              key={check.name}
              className={`flex items-center gap-2.5 ${check.result === "pass" ? "" : "text-warn-dark"} ${check.result === "fail" ? "text-bad" : ""}`}
            >
              {check.result === "pass" ? (
                <CheckIcon className="shrink-0 text-good" />
              ) : (
                <WarningIcon className="shrink-0" />
              )}
              {CHECK_PREFIX[check.result]}: {check.reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const SECONDS_PER_MINUTE = 60;

function formatActiveTime(activeSeconds: number): string {
  const minutes = Math.floor(activeSeconds / SECONDS_PER_MINUTE);
  const seconds = activeSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function TimeOnDenial({ activeSeconds }: { activeSeconds: number | null }) {
  return (
    <section
      aria-labelledby="time-heading"
      className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-white px-6 py-[22px]"
    >
      <div className="flex flex-col gap-1">
        <h2 id="time-heading" className="m-0 text-base font-semibold">
          Time on this denial
        </h2>
        <span className="text-[13px] text-muted">
          {activeSeconds === null ? "The timer isn't running yet" : "Pauses when you step away"}
        </span>
      </div>
      <span className="font-mono text-[26px] font-semibold">
        {activeSeconds === null ? "–:––" : formatActiveTime(activeSeconds)}
      </span>
    </section>
  );
}

type HistoryListProps = {
  items: { id: string; timestampLabel: string; description: string }[];
};

// Collapsed by default (F5), newest first (F13).
export function HistoryList({ items }: HistoryListProps) {
  const eventWord = items.length === 1 ? "event" : "events";
  return (
    <details className="group rounded-[20px] border border-line bg-white px-6 py-[18px]">
      <summary className="min-h-8 cursor-pointer text-base font-semibold">
        History · {items.length} {eventWord}
      </summary>
      {items.length === 0 ? (
        <p className="mt-3 mb-0 text-sm text-muted">Nothing recorded for this denial yet.</p>
      ) : (
        <ol className="mt-3 mb-0 flex list-none flex-col gap-2.5 p-0 text-sm text-subtle">
          {items.map((item) => (
            <li key={item.id}>
              {item.timestampLabel} · {item.description}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
