import { CostCalculator } from "./cost-calculator";

export function CostSection() {
  return (
    <section id="cost" aria-labelledby="cost-heading" className="border-y border-line bg-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-3">
          <h2
            id="cost-heading"
            className="display m-0 max-w-[20ch] text-[40px] text-ink sm:text-[56px]"
          >
            Nobody decides to write a denial off. The pile decides.
          </h2>
          <p className="m-0 max-w-[60ch] text-lg leading-relaxed text-subtle">
            A denial you never open looks exactly like one you chose to drop. Put in your own
            numbers and see what the pile is deciding for you.
          </p>
        </div>
        <CostCalculator />
      </div>
    </section>
  );
}
