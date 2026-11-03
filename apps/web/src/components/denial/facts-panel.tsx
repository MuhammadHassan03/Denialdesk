import type { FactsQuestion } from "@/lib/facts-questions";
import { suggestedActionLabel, type SuggestedAction } from "@/lib/suggested-action";

type FactsPanelProps = {
  question: FactsQuestion | null;
  answers: { choice: string | null; fieldValues: Record<string, string> };
  suggestedAction: SuggestedAction;
  suggestedActionReason: string;
  isReadOnly: boolean;
};

// "Facts only you know" (F6). Saving the answers arrives with drafting, so the
// inputs work locally but nothing is sent yet.
export function FactsPanel({
  question,
  answers,
  suggestedAction,
  suggestedActionReason,
  isReadOnly,
}: FactsPanelProps) {
  return (
    <section
      aria-labelledby="facts-heading"
      className="flex flex-col gap-[18px] rounded-[20px] border border-line bg-white px-7 py-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="facts-heading" className="m-0 text-lg font-semibold">
          {question === null ? "Suggested action" : "Facts only you know"}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand-dark">
          Suggested action: {suggestedActionLabel(suggestedAction)}
        </span>
      </div>

      {question === null ? null : (
        <>
          <fieldset disabled={isReadOnly} className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="mb-2.5 text-[15px] font-medium">{question.legend}</legend>
            <div className="flex flex-wrap gap-2.5">
              {question.choices.map((choice) => (
                <label
                  key={choice.value}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-4 text-sm transition-colors has-[:checked]:border-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:font-semibold"
                >
                  <input
                    type="radio"
                    name={question.name}
                    value={choice.value}
                    defaultChecked={answers.choice === choice.value}
                    className="accent-brand"
                  />
                  {choice.label}
                </label>
              ))}
            </div>
          </fieldset>
          {question.fields.length === 0 ? null : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {question.fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <label htmlFor={`fact-${field.name}`} className="text-sm font-medium">
                    {field.label}
                  </label>
                  <input
                    id={`fact-${field.name}`}
                    name={field.name}
                    type={field.inputType}
                    disabled={isReadOnly}
                    defaultValue={answers.fieldValues[field.name] ?? ""}
                    className={`min-h-11 rounded-xl border border-line-strong px-3.5 text-sm text-ink disabled:bg-well ${field.isCode ? "font-mono" : ""}`}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <p className="m-0 text-sm leading-normal text-muted">{suggestedActionReason}</p>
    </section>
  );
}
