import { RemittanceDecoder } from "./remittance-decoder";

export function LandingHero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto max-w-[1180px] px-4 pt-14 pb-16 sm:px-8 sm:pt-20"
    >
      <h1
        id="hero-heading"
        className="display m-0 max-w-[19ch] text-[52px] text-ink sm:text-[84px]"
      >
        The money is in the file. So is the deadline.
      </h1>
      <p className="mt-6 mb-0 max-w-[58ch] text-lg leading-relaxed text-subtle sm:text-xl">
        An 835 tells you what was denied, for how much and why, in a format nobody reads for fun.
        Denialdesk reads it for you, puts the biggest and most urgent denials first, and drafts the
        appeal or the corrected claim. You approve every word.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
        <a
          href="#pilot"
          className="inline-flex min-h-12 items-center rounded-md bg-brand px-6 text-base font-bold text-white no-underline transition-colors hover:bg-brand-dark hover:text-white"
        >
          Try it on your own denials
        </a>
        <span className="text-[15px] text-muted">
          Pick a line below to see what Denialdesk does with it.
        </span>
      </div>
      <div className="mt-8">
        <RemittanceDecoder />
      </div>
      <p className="mt-3 mb-0 text-[13px] text-muted">
        A synthetic remittance. No real patient or payer appears anywhere on this page.
      </p>
    </section>
  );
}
