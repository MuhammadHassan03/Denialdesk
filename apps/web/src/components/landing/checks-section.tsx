import { RulesCatch } from "./rules-catch";

export function ChecksSection() {
  return (
    <section id="checks" aria-labelledby="checks-heading" className="border-y border-line bg-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-3">
          <h2
            id="checks-heading"
            className="display m-0 max-w-[20ch] text-[40px] text-ink sm:text-[56px]"
          >
            You should not trust an AI letter. Neither do we.
          </h2>
          <p className="m-0 max-w-[62ch] text-lg leading-relaxed text-subtle">
            Every draft goes through a check that is plain code, not AI, before you see it. It
            compares claim numbers, amounts, citations and every quoted sentence with the record. A
            draft that fails cannot be approved. Here is one failing.
          </p>
        </div>
        <RulesCatch />
      </div>
    </section>
  );
}
