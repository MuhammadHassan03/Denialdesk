// The facts check asked before drafting (F6): one question per supported code, plus
// the follow-up fields that question needs. Questions live here, never in a prompt.

export type FactsChoice = {
  value: string;
  label: string;
};

export type FactsField = {
  name: string;
  label: string;
  inputType: "text" | "date";
  isCode: boolean;
};

export type FactsQuestion = {
  name: string;
  legend: string;
  choices: FactsChoice[];
  fields: FactsField[];
};

const YES_NO: FactsChoice[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const FACTS_QUESTIONS: Record<string, FactsQuestion> = {
  "CO-197": {
    name: "authObtained",
    legend: "Was an authorization obtained before the service?",
    choices: [...YES_NO, { value: "not_sure", label: "Not sure" }],
    fields: [
      { name: "authNumber", label: "Authorization number", inputType: "text", isCode: true },
      { name: "authIssuedDate", label: "Date it was issued", inputType: "date", isCode: false },
    ],
  },
  "CO-50": {
    name: "hasChartNotes",
    legend: "Do you have chart notes supporting the need for the service?",
    choices: YES_NO,
    fields: [
      {
        name: "diagnosisCodes",
        label: "Supporting diagnosis codes",
        inputType: "text",
        isCode: true,
      },
    ],
  },
  "CO-4": {
    name: "modifierKnown",
    legend: "Do you know which modifier the line should have?",
    choices: YES_NO,
    fields: [{ name: "modifier", label: "Modifier", inputType: "text", isCode: true }],
  },
  "CO-16": {
    name: "missingInfoKnown",
    legend: "Do the remark codes match what was missing?",
    choices: YES_NO,
    fields: [
      { name: "correctedValue", label: "Corrected value", inputType: "text", isCode: false },
    ],
  },
  "CO-29": {
    name: "hasTimelyFilingProof",
    legend: "Do you have proof the claim was filed on time?",
    choices: YES_NO,
    fields: [
      {
        name: "originalSubmissionDate",
        label: "Original submission date",
        inputType: "date",
        isCode: false,
      },
      { name: "proofType", label: "Proof type", inputType: "text", isCode: false },
    ],
  },
};

export function factsQuestionFor(code: string): FactsQuestion | null {
  return FACTS_QUESTIONS[code] ?? null;
}
