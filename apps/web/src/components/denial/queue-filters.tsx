import Link from "next/link";
import { ChevronDownIcon, CloseIcon } from "@/components/ui/icons";
import { DENIAL_STATUSES, denialStatusLabel } from "@/lib/denial-status";
import {
  hasActiveFilters,
  queueFiltersToQueryString,
  type DueFilter,
  type QueueFilters,
} from "@/lib/queue-filters";

export type QueueFilterOption = {
  value: string;
  label: string;
  detail: string;
  count: number;
};

type QueueFilterBarProps = {
  filters: QueueFilters;
  codeOptions: QueueFilterOption[];
  payerOptions: QueueFilterOption[];
  matchingCount: number;
};

const DUE_CHOICES: { value: DueFilter; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "any", label: "Any" },
];

const FIELD_LABEL_CLASSES = "text-[13px] font-medium text-muted";
const SUMMARY_CLASSES =
  "flex min-h-11 cursor-pointer list-none items-center justify-between gap-2.5 rounded-xl border px-3.5 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden";

function queueHref(filters: QueueFilters): string {
  const query = queueFiltersToQueryString({ ...filters, page: 1 });
  if (query === "") {
    return "/queue";
  }
  return `/queue?${query}`;
}

function selectionLabel(
  selected: string[],
  options: QueueFilterOption[],
  allLabel: string,
): string {
  if (selected.length === 0) {
    return allLabel;
  }
  if (selected.length > 1) {
    return `${selected.length} selected`;
  }
  for (const option of options) {
    if (option.value === selected[0]) {
      return option.label;
    }
  }
  return allLabel;
}

function statusLabel(status: QueueFilters["status"]): string {
  if (status === "open") {
    return "Open";
  }
  if (status === "all") {
    return "All";
  }
  return denialStatusLabel(status);
}

type MultiSelectProps = {
  id: string;
  label: string;
  name: string;
  options: QueueFilterOption[];
  selected: string[];
  allLabel: string;
  minWidthClass: string;
};

// A dropdown of checkboxes. It is a <details>, so it opens and closes without JavaScript.
function MultiSelect({
  id,
  label,
  name,
  options,
  selected,
  allLabel,
  minWidthClass,
}: MultiSelectProps) {
  const isFiltered = selected.length > 0;
  const stateClasses = isFiltered
    ? "border-brand bg-brand-soft font-semibold text-brand-dark"
    : "border-line-strong bg-white text-ink";
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className={FIELD_LABEL_CLASSES}>
        {label}
      </span>
      <details className="group relative">
        <summary
          aria-labelledby={id}
          className={`${SUMMARY_CLASSES} ${minWidthClass} ${stateClasses}`}
        >
          {selectionLabel(selected, options, allLabel)}
          <ChevronDownIcon size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute top-[calc(100%+8px)] left-0 z-20 flex w-[300px] animate-pop flex-col gap-0.5 rounded-2xl border border-line-strong bg-white p-2 shadow-[0_2px_4px_rgba(14,23,38,0.06),0_28px_56px_-20px_rgba(14,23,38,0.35)]">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-sm hover:bg-well has-[:checked]:bg-brand-tint"
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                defaultChecked={selected.includes(option.value)}
                className="size-[18px] accent-brand"
              />
              <span className="font-semibold">{option.label}</span>
              <span className="flex-1 truncate text-muted">{option.detail}</span>
              <span className="font-mono text-muted">{option.count}</span>
            </label>
          ))}
          <div className="mt-1 flex justify-end border-t border-line-soft px-1 pt-2">
            <button
              type="submit"
              className="min-h-10 rounded-[10px] bg-brand px-3.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Apply
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}

export function QueueFilterBar({
  filters,
  codeOptions,
  payerOptions,
  matchingCount,
}: QueueFilterBarProps) {
  const statusIsDefault = filters.status === "open";
  return (
    <section
      aria-label="Filters"
      className="relative z-10 flex flex-col gap-3.5 rounded-[20px] border border-line bg-white px-5 py-[18px]"
    >
      <form action="/queue" method="get" className="flex flex-wrap items-end gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-status" className={FIELD_LABEL_CLASSES}>
            Status
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={filters.status}
            className={`min-h-11 min-w-[150px] rounded-xl border px-3 text-sm font-semibold ${statusIsDefault ? "border-brand bg-brand-soft text-brand-dark" : "border-line-strong bg-white text-ink"}`}
          >
            <option value="open">Open</option>
            <option value="all">All</option>
            {DENIAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {denialStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <MultiSelect
          id="filter-code"
          label="Denial code"
          name="code"
          options={codeOptions}
          selected={filters.codes}
          allLabel="All codes"
          minWidthClass="min-w-[190px]"
        />
        <MultiSelect
          id="filter-payer"
          label="Payer"
          name="payer"
          options={payerOptions}
          selected={filters.payerIds}
          allLabel="All payers"
          minWidthClass="min-w-[180px]"
        />

        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className={`${FIELD_LABEL_CLASSES} mb-1.5`}>Due</legend>
          <div className="flex gap-1 rounded-xl border border-line-strong bg-well p-1">
            {DUE_CHOICES.map((choice) => (
              <label
                key={choice.value}
                className={`flex min-h-9 cursor-pointer items-center rounded-[9px] px-3 text-sm font-semibold transition has-[:checked]:bg-white has-[:checked]:text-ink has-[:checked]:shadow-[0_1px_3px_rgba(14,23,38,0.12)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${choice.value === "overdue" ? "text-bad" : "text-subtle"}`}
              >
                <input
                  type="radio"
                  name="due"
                  value={choice.value}
                  defaultChecked={filters.due === choice.value}
                  className="sr-only"
                />
                {choice.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex min-w-[220px] flex-[1_1_260px] flex-col gap-1.5">
          <label htmlFor="queue-search" className={FIELD_LABEL_CLASSES}>
            Search
          </label>
          <input
            id="queue-search"
            type="search"
            name="q"
            defaultValue={filters.search}
            placeholder="Claim or patient control number"
            className="min-h-11 rounded-xl border border-line-strong bg-white px-3.5 text-sm text-ink"
          />
        </div>

        <button
          type="submit"
          className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Apply filters
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
        <span className="text-[13px] text-muted">Active:</span>
        <ActiveChips filters={filters} codeOptions={codeOptions} payerOptions={payerOptions} />
        {hasActiveFilters(filters) ? (
          <Link href="/queue" className="ml-1 text-[13px] font-semibold">
            Clear filters
          </Link>
        ) : null}
        <span className="ml-auto text-[13px] text-muted" aria-live="polite">
          {matchingCount === 1 ? "1 denial matches" : `${matchingCount} denials match`}
        </span>
      </div>
    </section>
  );
}

type ActiveChipsProps = {
  filters: QueueFilters;
  codeOptions: QueueFilterOption[];
  payerOptions: QueueFilterOption[];
};

function Chip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      aria-label={`Remove filter ${label}`}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand-shadow bg-brand-soft px-2.5 text-[13px] font-semibold text-brand-dark no-underline hover:bg-brand-shadow hover:text-brand-dark"
    >
      {label}
      <CloseIcon size={14} />
    </Link>
  );
}

function optionLabel(options: QueueFilterOption[], value: string): string {
  for (const option of options) {
    if (option.value === value) {
      return option.label;
    }
  }
  return value;
}

function ActiveChips({ filters, codeOptions, payerOptions }: ActiveChipsProps) {
  const chips: { label: string; href: string }[] = [];
  chips.push({
    label: `Status: ${statusLabel(filters.status)}`,
    href: queueHref({ ...filters, status: filters.status === "open" ? "all" : "open" }),
  });
  for (const code of filters.codes) {
    const remainingCodes = filters.codes.filter((selectedCode) => selectedCode !== code);
    chips.push({
      label: `Code: ${optionLabel(codeOptions, code)}`,
      href: queueHref({ ...filters, codes: remainingCodes }),
    });
  }
  for (const payerId of filters.payerIds) {
    const remainingPayers = filters.payerIds.filter((selectedPayer) => selectedPayer !== payerId);
    chips.push({
      label: `Payer: ${optionLabel(payerOptions, payerId)}`,
      href: queueHref({ ...filters, payerIds: remainingPayers }),
    });
  }
  if (filters.due !== "any") {
    const dueLabel = DUE_CHOICES.find((choice) => choice.value === filters.due)?.label ?? "";
    chips.push({ label: `Due: ${dueLabel}`, href: queueHref({ ...filters, due: "any" }) });
  }
  if (filters.search !== "") {
    chips.push({ label: `Search: ${filters.search}`, href: queueHref({ ...filters, search: "" }) });
  }
  return (
    <>
      {chips.map((chip) => (
        <Chip key={chip.label} label={chip.label} href={chip.href} />
      ))}
    </>
  );
}
