// The six boxes are a real sequence, so they are numbered the way boxes on a claim form are.
type WorkStep = {
  title: string;
  detail: string;
  doneBy: "You" | "Denialdesk";
};

const WORK_STEPS: WorkStep[] = [
  {
    title: "Upload the 835",
    detail: "Drop in the remittance files exactly as the payer sent them.",
    doneBy: "You",
  },
  {
    title: "Every denial, ranked",
    detail: "Sorted by days left, then dollars. Anything due within 7 days is flagged.",
    doneBy: "Denialdesk",
  },
  {
    title: "Answer what only you know",
    detail: "Was there an authorization? Do you have proof of timely filing? One short question.",
    doneBy: "You",
  },
  {
    title: "A draft is written",
    detail: "An appeal letter or the corrected claim fields, built from the file and your answer.",
    doneBy: "Denialdesk",
  },
  {
    title: "The draft is checked",
    detail: "Claim numbers, amounts, quotes and citations are compared with the record.",
    doneBy: "Denialdesk",
  },
  {
    title: "Approve and export",
    detail: "Edit anything, then approve. Only approved work can be exported.",
    doneBy: "You",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="mx-auto max-w-[1180px] px-4 py-16 sm:px-8 sm:py-20"
    >
      <h2 id="how-heading" className="display m-0 max-w-[18ch] text-[40px] text-ink sm:text-[56px]">
        It does the reading and the typing. You do the deciding.
      </h2>
      <ol className="mt-10 mb-0 grid list-none grid-cols-1 border-t-2 border-l-2 border-form p-0 sm:grid-cols-2 lg:grid-cols-3">
        {WORK_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex min-h-[176px] flex-col gap-2 border-r-2 border-b-2 border-form bg-paper px-5 pt-3 pb-5"
          >
            <span className="flex items-baseline justify-between gap-3 text-[13px] font-semibold text-form">
              <span>{index + 1}. Done by</span>
              <span className={step.doneBy === "You" ? "font-bold text-brand" : "text-form"}>
                {step.doneBy}
              </span>
            </span>
            <h3 className="m-0 mt-2 text-xl leading-tight font-bold text-ink">{step.title}</h3>
            <p className="m-0 text-[15px] leading-relaxed text-subtle">{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
