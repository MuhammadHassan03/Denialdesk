const STEPS = [
  {
    title: "Upload your 835s",
    text: "Drop in remittance files or EOB PDFs. Every denial is pulled out with its codes, amount and deadline.",
  },
  {
    title: "Work the ranked queue",
    text: "Overdue and soon-due denials come first, largest amounts on top, so nothing valuable slips past its date.",
  },
  {
    title: "Answer two questions",
    text: "Was there an auth? Do you have proof of timely filing? Your answers decide fix, appeal or write off.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="mx-auto flex max-w-[1240px] scroll-mt-20 flex-col gap-10 px-4 pt-24 pb-12 sm:px-8"
    >
      <div className="reveal-on-scroll flex max-w-[640px] flex-col gap-2.5">
        <h2
          id="how-heading"
          className="m-0 text-[32px] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[40px]"
        >
          From remittance file to a letter you can send
        </h2>
        <p className="m-0 text-[17px] leading-[1.6] text-muted">
          The same four steps for every denial, in the order you do them today.
        </p>
      </div>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 p-0">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="reveal-on-scroll flex flex-col gap-2.5 rounded-[20px] border border-line bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(14,23,38,0.25)]"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-brand-soft font-mono font-semibold text-brand">
              {index + 1}
            </span>
            <h3 className="m-0 text-lg font-bold">{step.title}</h3>
            <p className="m-0 text-[15px] leading-[1.55] text-muted">{step.text}</p>
          </li>
        ))}
        <li className="reveal-on-scroll flex flex-col gap-2.5 rounded-[20px] bg-brand-night p-6 text-white shadow-[0_24px_48px_-24px_rgba(10,61,57,0.7)] transition duration-300 hover:-translate-y-1">
          <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-white/14 font-mono font-semibold">
            4
          </span>
          <h3 className="m-0 text-lg font-bold">Approve and export</h3>
          <p className="m-0 text-[15px] leading-[1.55] text-brand-mist">
            Read the checked draft, edit if you want, approve it and download the letter or the
            corrected claim fields.
          </p>
        </li>
      </ol>
    </section>
  );
}
