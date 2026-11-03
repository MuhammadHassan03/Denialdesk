// The two tilted file cards in the drop zone. Decorative only.
export function DropIllustration() {
  return (
    <div aria-hidden="true" className="relative h-[240px] w-[320px] [perspective:1000px]">
      <div className="absolute top-[168px] left-1/2 -ml-[130px] h-[54px] w-[260px] rounded-[50%] bg-brand/16 blur-[14px]" />
      <div
        className="absolute top-[26px] left-[34px] flex h-[196px] w-[168px] animate-float-slow flex-col gap-2.5 rounded-[18px] border border-line-strong bg-white p-[18px] shadow-[0_30px_50px_-24px_rgba(14,23,38,0.35)]"
        style={{ transform: "rotateX(22deg) rotateY(-18deg) rotateZ(-10deg)" }}
      >
        <span className="self-start rounded-lg bg-warn-soft px-2.5 py-1 text-[13px] font-bold text-warn-dark">
          PDF
        </span>
        <span className="h-2 w-4/5 rounded bg-line" />
        <span className="h-2 w-3/5 rounded bg-line" />
        <span className="h-2 w-[70%] rounded bg-line" />
        <span className="mt-auto text-sm font-semibold text-subtle">EOB</span>
      </div>
      <div
        className="absolute top-1.5 left-[128px] flex h-[196px] w-[168px] animate-float flex-col gap-2.5 rounded-[18px] border border-brand-light bg-white p-[18px] shadow-[0_36px_60px_-24px_rgba(11,110,102,0.45)]"
        style={{ transform: "rotateX(18deg) rotateY(16deg) rotateZ(8deg)" }}
      >
        <span className="self-start rounded-lg bg-brand px-2.5 py-1 font-mono text-[13px] font-bold text-white">
          835
        </span>
        <span className="font-mono text-[11px] leading-relaxed text-muted">
          ISA*00*...
          <br />
          CLP*20517*4
          <br />
          CAS*CO*197
        </span>
        <span className="mt-auto text-sm font-semibold text-subtle">Remittance</span>
      </div>
    </div>
  );
}
