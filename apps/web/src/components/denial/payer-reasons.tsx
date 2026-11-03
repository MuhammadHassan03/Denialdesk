import Link from "next/link";
import { formatCents } from "@/lib/money";

type PayerReasonsProps = {
  reasons: { label: string; meaning: string }[];
  serviceLine: {
    lineLabel: string;
    procedureCode: string | null;
    modifiers: string[];
    billedCents: number;
    paidCents: number;
  };
  otherDenialsOnClaim: { href: string; code: string }[];
};

// "What the payer said": every code next to its meaning, never a code alone (F5).
export function PayerReasons({ reasons, serviceLine, otherDenialsOnClaim }: PayerReasonsProps) {
  let procedureText = "No procedure code on this line";
  if (serviceLine.procedureCode !== null) {
    procedureText = `CPT ${serviceLine.procedureCode}`;
    if (serviceLine.modifiers.length > 0) {
      procedureText += `-${serviceLine.modifiers.join("-")}`;
    }
  }
  return (
    <section
      aria-labelledby="payer-reasons-heading"
      className="flex flex-col gap-4 rounded-[20px] border border-line bg-white px-7 py-6"
    >
      <h2 id="payer-reasons-heading" className="m-0 text-lg font-semibold">
        What the payer said
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reasons.map((reason) => (
          <div
            key={reason.label}
            className="flex flex-col gap-1.5 rounded-[14px] border border-line-soft bg-well p-4"
          >
            <span className="font-mono font-semibold">{reason.label}</span>
            <span className="text-sm leading-normal text-subtle">{reason.meaning}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-6 pt-1 text-sm text-subtle">
        <span>
          {serviceLine.lineLabel} · <span className="font-mono">{procedureText}</span>
        </span>
        <span>
          Billed <span className="font-mono">{formatCents(serviceLine.billedCents)}</span>
        </span>
        <span>
          Paid <span className="font-mono">{formatCents(serviceLine.paidCents)}</span>
        </span>
      </div>
      {otherDenialsOnClaim.length === 0 ? null : (
        <p className="m-0 border-t border-line-soft pt-3 text-sm text-muted">
          Other denials on this claim:{" "}
          {otherDenialsOnClaim.map((sibling, index) => (
            <span key={sibling.href}>
              {index > 0 ? ", " : null}
              <Link href={sibling.href} className="font-semibold">
                {sibling.code}
              </Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
