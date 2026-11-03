import { CheckIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/logo-mark";

// Every card shares the same tilt. They differ only in depth, so the stack reads as one pile.
const CARD_TILT = "rotateX(24deg) rotateZ(-6deg)";

// The dark left panel of the sign-in screens. Decorative cards are hidden from screen readers.
export function AuthShowcase() {
  return (
    <section
      aria-label="About Denialdesk"
      className="flex min-h-[560px] flex-[1_1_520px] flex-col justify-between gap-8 overflow-hidden bg-brand-night p-8 text-white sm:p-12"
    >
      <div className="flex items-center gap-2.5 text-xl font-bold">
        <LogoMark onDark size={30} />
        Denialdesk
      </div>

      <div aria-hidden="true" className="relative h-[340px] [perspective:1200px]">
        <div
          className="absolute top-[150px] left-[6%] flex w-[300px] animate-float-slow flex-col gap-2 rounded-[18px] bg-white px-5 py-[18px] text-ink shadow-[0_40px_60px_-30px_rgba(0,0,0,0.6)]"
          style={{ transform: `${CARD_TILT} translateZ(0px)` }}
        >
          <span className="text-xs font-semibold text-bad">DENIED</span>
          <span className="font-mono font-semibold">CO-50 · $4,820.00</span>
          <span className="h-2 w-[70%] rounded bg-line-soft" />
        </div>
        <div
          className="absolute top-[80px] left-[24%] flex w-[300px] animate-float flex-col gap-2 rounded-[18px] bg-white px-5 py-[18px] text-ink shadow-[0_50px_70px_-30px_rgba(0,0,0,0.6)]"
          style={{ transform: `${CARD_TILT} translateZ(60px)` }}
        >
          <span className="text-xs font-semibold text-brand">DRAFT · CHECKS PASSED</span>
          <span className="h-2 w-[90%] rounded bg-brand-soft" />
          <span className="h-2 w-[80%] rounded bg-brand-soft" />
          <span className="h-2 w-[60%] rounded bg-brand-soft" />
        </div>
        <div
          className="absolute top-2.5 left-[42%] flex w-[260px] animate-float-slow items-center gap-2.5 rounded-[18px] bg-good-soft px-5 py-[18px] text-good-dark shadow-[0_60px_80px_-30px_rgba(0,0,0,0.65)]"
          style={{ transform: `${CARD_TILT} translateZ(120px)` }}
        >
          <CheckIcon size={22} />
          <span className="font-bold">Approved by you</span>
        </div>
      </div>

      <div className="flex max-w-[460px] flex-col gap-2.5">
        <h2 className="m-0 text-[30px] leading-tight font-bold tracking-[-0.02em]">
          Work denials faster. Approve every word.
        </h2>
        <p className="m-0 text-base leading-relaxed text-brand-mist">
          Denialdesk drafts the appeal or the corrected claim. Nothing leaves without your OK.
        </p>
      </div>
    </section>
  );
}
