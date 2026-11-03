// The one-line result at the top of the draft panel (F7).

export type RuleOutcome = "pass" | "warn" | "fail";

export type RulesSummary = {
  overall: RuleOutcome;
  headline: string;
  warningText: string | null;
};

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five"];

function countWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

export function summarizeRules(checks: { result: RuleOutcome; reason: string }[]): RulesSummary {
  const failures: string[] = [];
  const warnings: string[] = [];
  for (const check of checks) {
    if (check.result === "fail") {
      failures.push(check.reason);
    }
    if (check.result === "warn") {
      warnings.push(check.reason);
    }
  }

  if (failures.length > 0) {
    const problemWord = failures.length === 1 ? "problem" : "problems";
    return {
      overall: "fail",
      headline: `${failures.length} ${problemWord} to fix`,
      warningText: null,
    };
  }

  const headline = `All ${checks.length} checks passed`;
  if (warnings.length === 0) {
    return { overall: "pass", headline, warningText: null };
  }
  const warningWord = warnings.length === 1 ? "warning" : "warnings";
  const warningText = `${countWord(warnings.length)} ${warningWord}: ${warnings.join("; ")}.`;
  return { overall: "warn", headline, warningText };
}
