import { CheckIcon } from "@/components/ui/icons";

const CHECK_RULES = [
  "Claim numbers, dates and amounts must match the remittance.",
  "Every quote must exist in the payer policy it cites.",
  "Corrected claims get frequency code 7 and an allowed modifier.",
  "Nothing contradicts the facts you gave.",
];

const CHECK_TAGS = [
  { label: "Matches the 835", topClass: "top-[30px]", delayClass: "[animation-delay:200ms]" },
  { label: "From your answers", topClass: "top-[120px]", delayClass: "[animation-delay:500ms]" },
  {
    label: "Quote found word for word",
    topClass: "top-[210px]",
    delayClass: "[animation-delay:800ms]",
  },
];

function CheckedLetter() {
  return (
    <div aria-hidden="true" className="reveal-on-scroll relative flex-[1_1_520px] pr-6 pb-6">
      <div className="absolute top-6 right-0 bottom-0 left-6 rounded-[18px] bg-line" />
      <div className="absolute inset-3 rounded-[18px] bg-line-soft" />
      <div className="relative flex flex-col gap-4 rounded-[18px] border border-line-strong bg-white px-6 py-8 font-serif text-base leading-[1.7] text-ink-soft shadow-[0_30px_60px_-30px_rgba(14,23,38,0.35)] sm:px-10 sm:py-9">
        <p className="m-0 font-semibold">
          Re: Request for reconsideration, claim{" "}
          <span className="border-b-2 border-brand bg-brand-soft">CLM-20517</span>
        </p>
        <p className="m-0">
          Northwind Health issued authorization{" "}
          <span className="border-b-2 border-warn bg-warn-soft">AUTH-88213</span> on August 30,
          2026, ten days before the service.
        </p>
        <p className="m-0">
          The payer&rsquo;s policy states:{" "}
          <span className="border-b-2 border-good bg-good-soft">
            &ldquo;Services performed within the approved authorization period are eligible for
            payment.&rdquo;
          </span>
        </p>
        <p className="m-0">We ask that you reprocess the claim and pay the allowed amount.</p>
      </div>
      {CHECK_TAGS.map((tag) => (
        <div
          key={tag.label}
          className={`absolute -right-2 hidden animate-pop rounded-xl bg-ink px-3.5 py-2.5 font-sans text-[13px] font-semibold text-white shadow-[0_16px_30px_-14px_rgba(14,23,38,0.6)] sm:block ${tag.topClass} ${tag.delayClass}`}
        >
          {tag.label}
        </div>
      ))}
    </div>
  );
}

export function SafetyChecks() {
  return (
    <section
      id="checks"
      aria-labelledby="checks-heading"
      className="mx-auto flex max-w-[1240px] scroll-mt-20 flex-wrap items-center gap-14 px-4 pt-16 pb-24 sm:px-8"
    >
      <CheckedLetter />
      <div className="reveal-on-scroll flex max-w-[520px] flex-[1_1_420px] flex-col gap-5">
        <h2
          id="checks-heading"
          className="m-0 text-[32px] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[40px]"
        >
          Every draft is checked before you see it
        </h2>
        <p className="m-0 text-[17px] leading-[1.6] text-muted">
          AI writes the first draft. A second layer of plain rules then checks it against your 835,
          your answers and the payer&rsquo;s stored policy. A draft that fails comes back with the
          reason, and you can&rsquo;t approve it until it passes.
        </p>
        <ul className="m-0 flex list-none flex-col gap-3 p-0 text-base">
          {CHECK_RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-3">
              <CheckIcon size={22} className="shrink-0 text-brand" />
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
