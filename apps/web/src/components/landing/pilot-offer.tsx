export function PilotOffer() {
  return (
    <section
      id="pilot"
      aria-labelledby="pilot-heading"
      className="mx-auto max-w-[1240px] scroll-mt-20 px-4 py-24 sm:px-8"
    >
      <div className="reveal-on-scroll relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-3.5 rounded-[32px] bg-brand-shadow"
        />
        <div className="relative flex flex-wrap items-center gap-12 rounded-[32px] bg-brand-night p-8 text-white shadow-[0_40px_80px_-40px_rgba(10,61,57,0.8)] sm:p-14">
          <div className="flex flex-[1_1_440px] flex-col gap-4">
            <h2
              id="pilot-heading"
              className="m-0 text-[34px] leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-[44px]"
            >
              Try it on your own denials for two weeks
            </h2>
            <p className="m-0 text-[17px] leading-[1.6] text-brand-mist">
              We time minutes per denial the usual way and with Denialdesk, on your real work. If it
              isn&rsquo;t clearly faster, you&rsquo;ve lost nothing.
            </p>
          </div>
          <div className="flex flex-[1_1_340px] flex-col gap-3.5 rounded-[22px] border border-white/20 bg-white/8 p-7">
            <span className="text-[15px] text-brand-mist">After the pilot</span>
            <span className="text-[40px] font-extrabold tracking-[-0.02em]">
              $150{" "}
              <span className="text-[17px] font-medium text-brand-mist">per biller, per month</span>
            </span>
            <span className="text-[15px] text-brand-mist">The two-week pilot is free.</span>
            {/* TODO: point at the real booking link once there is one. */}
            <a
              href="#pilot"
              className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-white px-[22px] text-base font-bold text-brand-night no-underline transition hover:-translate-y-0.5 hover:bg-brand-mist hover:text-brand-night"
            >
              Book a pilot
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
