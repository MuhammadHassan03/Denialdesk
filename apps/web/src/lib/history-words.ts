// One audit event in plain words for the History list (F13).

export type HistoryEventInput = {
  action: string;
  actor: "user" | "system";
  draftVersion: number | null;
  sourceFilename: string | null;
};

const USER_ACTION_WORDS: Record<string, string> = {
  opened: "You opened this denial",
  details_confirmed: "You confirmed the details",
  deadline_changed: "You changed the deadline",
  facts_saved: "You saved the facts",
  action_overridden: "You changed the suggested action",
  draft_requested: "You asked for a draft",
  draft_edited: "You edited the draft",
  written_off: "You wrote off this denial",
  reopened: "You reopened this denial",
  exported: "You exported the approved draft",
  copied: "You copied the corrected fields",
  submitted: "You marked it as submitted",
};

function versionText(draftVersion: number | null): string {
  if (draftVersion === null) {
    return "";
  }
  return ` version ${draftVersion}`;
}

export function describeHistoryEvent(event: HistoryEventInput): string {
  if (event.action === "denial_created") {
    if (event.sourceFilename === null) {
      return "Created from an uploaded file";
    }
    return `Created from ${event.sourceFilename}`;
  }
  if (event.action === "draft_created") {
    const author = event.actor === "system" ? "AI wrote" : "You wrote";
    return `${author} draft${versionText(event.draftVersion)}`;
  }
  if (event.action === "rules_checked") {
    return `Rules check ran on draft${versionText(event.draftVersion)}`;
  }
  if (event.action === "approved") {
    return `You approved draft${versionText(event.draftVersion)}`;
  }
  if (event.action === "draft_rejected") {
    return `You rejected draft${versionText(event.draftVersion)}`;
  }
  if (event.action === "outcome_matched") {
    return "A later 835 was matched to this denial";
  }
  return USER_ACTION_WORDS[event.action] ?? "Something changed";
}
