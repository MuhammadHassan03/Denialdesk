import { CheckCircleIcon, CheckIcon } from "@/components/ui/icons";

// One tilt shared by the queue card and the letter, so they read as one stack.
const STACK_TILT = "rotateX(28deg) rotateY(-14deg) rotateZ(-8deg)";

const SAMPLE_QUEUE_ROWS = [
  {
    deadline: "Overdue 2 days",
    deadlineClass: "text-bad",
    amount: "$4,820.00",
    code: "CO-50",
    isSelected: false,
  },
  {
    deadline: "Due in 3 days",
    deadlineClass: "text-warn",
    amount: "$2,310.00",
    code: "CO-197",
    isSelected: true,
  },
  {
    deadline: "Due in 6 days",
    deadlineClass: "text-warn",
    amount: "$1,140.00",
    code: "CO-4",
    isSelected: false,
  },
  {
    deadline: "Due in 18 days",
    deadlineClass: "text-subtle",
    amount: "$3,975.00",
    code: "CO-50",
    isSelected: false,
  },
];

function ProductStack() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden h-[520px] flex-[1_1_520px] [perspective:1400px] lg:block"
    >
      <div className="absolute bottom-2.5 left-1/2 -ml-60 h-[70px] w-[480px] rounded-[50%] bg-black/35 blur-[24px]" />

      <div
        className="absolute top-10 left-0 flex w-[420px] animate-float-slow flex-col gap-2 rounded-[20px] bg-canvas p-4 text-ink shadow-[0_40px_70px_-30px_rgba(0,0,0,0.7)]"
        style={{ transform: `${STACK_TILT} translateZ(-60px)` }}
      >
        <span className="px-1 py-0.5 text-[13px] font-bold text-subtle">Your queue</span>
        {SAMPLE_QUEUE_ROWS.map((row) => (
          <div
            key={row.amount}
            className={`flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-[13px] ${row.isSelected ? "shadow-[inset_3px_0_0_#0B6E66]" : ""}`}
          >
            <span className={`font-semibold ${row.deadlineClass}`}>{row.deadline}</span>
            <span className="font-mono font-semibold">{row.amount}</span>
            <span>{row.code}</span>
          </div>
        ))}
      </div>

      <div
        className="absolute top-[120px] left-[150px] flex w-[360px] animate-float flex-col gap-2.5 rounded-2xl bg-white px-7 py-[26px] font-serif text-[15px] leading-[1.6] text-ink-soft shadow-[0_60px_90px_-36px_rgba(0,0,0,0.75)] [animation-delay:-2s]"
        style={{ transform: `${STACK_TILT} translateZ(60px)` }}
      >
        <span className="font-semibold">Re: Request for reconsideration, claim CLM-20517</span>
        <span>
          Authorization AUTH-88213 was issued on August 30, 2026, ten days before the service.
        </span>
        <span className="rounded bg-brand-soft px-1 py-0.5">
          &ldquo;Services performed within the approved authorization period are eligible for
          payment.&rdquo;
        </span>
        <span className="h-2 w-[70%] rounded bg-line-soft" />
      </div>

      <div className="absolute top-[70px] right-2.5 flex animate-pop items-center gap-2 rounded-[14px] border border-white/35 bg-white/16 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)] backdrop-blur-[10px] [animation-delay:600ms] [transform:translateZ(140px)]">
        <CheckIcon className="text-[#9EF0C0]" />
        All 8 checks passed
      </div>

      <div className="absolute right-10 bottom-[70px] flex animate-pop items-center gap-2 rounded-[14px] bg-good-soft px-[18px] py-3.5 text-[15px] font-bold text-good-dark shadow-[0_30px_50px_-20px_rgba(0,0,0,0.7)] [animation-delay:1100ms] [transform:translateZ(180px)]">
        <CheckCircleIcon size={20} />
        Approved by you
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden bg-brand-night text-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-14 px-4 pt-16 pb-20 sm:px-8 sm:pt-[88px] sm:pb-[104px]">
        <div className="flex max-w-[560px] flex-[1_1_460px] animate-rise flex-col gap-6">
          <h1
            id="hero-heading"
            className="m-0 text-[44px] leading-[1.04] font-extrabold tracking-[-0.035em] sm:text-[64px]"
          >
            Work every denial before its deadline.
          </h1>
          <p className="m-0 text-[19px] leading-[1.55] text-brand-mist">
            Denialdesk reads your 835s, ranks every denial by dollars and days left, and drafts the
            appeal with the payer&rsquo;s own policy quoted. You approve every word before anything
            goes out.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#pilot"
              className="inline-flex min-h-[52px] items-center rounded-[14px] bg-white px-6 text-base font-bold text-brand-night no-underline shadow-[0_14px_30px_-14px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5 hover:text-brand-night"
            >
              Try it on your own denials
            </a>
            <a
              href="#how"
              className="inline-flex min-h-[52px] items-center rounded-[14px] border border-white/35 px-[22px] text-base font-semibold text-white no-underline transition hover:bg-white/10 hover:text-white"
            >
              See how it works
            </a>
          </div>
          <p className="m-0 text-sm text-brand-light">
            For billers at independent practices and billing companies in the US.
          </p>
        </div>
        <ProductStack />
      </div>
    </section>
  );
}
