const PROMISES = [
  {
    title: "Nothing goes out without your approval",
    text: "Denialdesk never contacts a payer. You export the approved letter and send it the way you already do.",
  },
  {
    title: "Your facts come first",
    text: "You answer what only you know. The draft is written around your answers, never around a guess.",
  },
  {
    title: "Every version is kept",
    text: "Each draft, edit and decision is saved with who made it and when, so you can always see what was sent and why.",
  },
];

export function BillerControl() {
  return (
    <section aria-labelledby="control-heading" className="border-y border-line bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-14 px-4 py-[88px] sm:px-8">
        <h2
          id="control-heading"
          className="reveal-on-scroll m-0 max-w-[460px] flex-[1_1_380px] text-[32px] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[40px]"
        >
          Built for the biller doing the work
        </h2>
        <dl className="m-0 flex flex-[1_1_520px] flex-col gap-7">
          {PROMISES.map((promise) => (
            <div
              key={promise.title}
              className="reveal-on-scroll flex flex-col gap-1.5 border-b border-line-soft pb-6 last:border-b-0 last:pb-0"
            >
              <dt className="text-xl font-bold">{promise.title}</dt>
              <dd className="m-0 text-base leading-[1.6] text-muted">{promise.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
