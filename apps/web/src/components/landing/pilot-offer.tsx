const PILOT_TERMS: string[] = [
  "Two weeks on your real denials.",
  "We time minutes per denial your usual way and with Denialdesk.",
  "If it isn't clearly faster, you've lost nothing.",
];

export function PilotOffer() {
  return (
    <section
      id="pilot"
      aria-labelledby="pilot-heading"
      className="mx-auto max-w-[1180px] px-4 py-16 sm:px-8 sm:py-20"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-end">
        <div className="flex flex-col gap-5">
          <h2
            id="pilot-heading"
            className="display m-0 max-w-[16ch] text-[40px] text-ink sm:text-[56px]"
          >
            Try it on your own denials for two weeks
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-lg text-subtle">
            {PILOT_TERMS.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-start gap-4 border-l-2 border-form pl-6">
          <p className="m-0 text-lg text-subtle">
            <span className="display text-[64px] text-ink">$150</span> for the pilot
          </p>
          {/* TODO: point at the real booking link once there is one. */}
          <a
            href="#pilot"
            className="inline-flex min-h-12 items-center rounded-md bg-brand px-6 text-base font-bold text-white no-underline transition-colors hover:bg-brand-dark hover:text-white"
          >
            Book a pilot
          </a>
          <p className="m-0 max-w-[44ch] text-[15px] leading-relaxed text-muted">
            Pilots run on de-identified data until a business associate agreement is signed. Drafts
            cover CO-197, CO-50, CO-4, CO-16 and CO-29 today. Other codes are shown with their
            meaning for you to work your usual way.
          </p>
        </div>
      </div>
    </section>
  );
}
