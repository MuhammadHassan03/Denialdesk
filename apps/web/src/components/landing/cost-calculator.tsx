"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";

const CENTS_PER_DOLLAR = 100;
const MONTHS_PER_YEAR = 12;
const DEFAULT_DENIALS_PER_MONTH = 120;
const DEFAULT_AVERAGE_DOLLARS = 280;
const DEFAULT_WORKED_PERCENT = 40;
const MAX_DENIALS_PER_MONTH = 100000;
const MAX_AVERAGE_DOLLARS = 100000;

function wholeNumberBetween(rawValue: string, maximum: number): number {
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return Math.min(parsed, maximum);
}

const INPUT_CLASSES =
  "min-h-12 w-full rounded-md border border-line-strong bg-paper px-3.5 text-lg font-semibold text-ink";

// The biller's own numbers, worked out in the browser. Nothing here is sent anywhere.
export function CostCalculator() {
  const [denialsPerMonth, setDenialsPerMonth] = useState(DEFAULT_DENIALS_PER_MONTH);
  const [averageDollars, setAverageDollars] = useState(DEFAULT_AVERAGE_DOLLARS);
  const [workedPercent, setWorkedPercent] = useState(DEFAULT_WORKED_PERCENT);

  const denialsNotWorked = Math.round((denialsPerMonth * (100 - workedPercent)) / 100);
  const monthlyCents = denialsNotWorked * averageDollars * CENTS_PER_DOLLAR;
  const yearlyCents = monthlyCents * MONTHS_PER_YEAR;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cost-denials" className="text-[15px] font-semibold">
            Denials you get in a month
          </label>
          <input
            id="cost-denials"
            type="number"
            inputMode="numeric"
            min={0}
            value={denialsPerMonth}
            onChange={(event) =>
              setDenialsPerMonth(wholeNumberBetween(event.target.value, MAX_DENIALS_PER_MONTH))
            }
            className={INPUT_CLASSES}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cost-average" className="text-[15px] font-semibold">
            Average amount on a denial, in dollars
          </label>
          <input
            id="cost-average"
            type="number"
            inputMode="numeric"
            min={0}
            value={averageDollars}
            onChange={(event) =>
              setAverageDollars(wholeNumberBetween(event.target.value, MAX_AVERAGE_DOLLARS))
            }
            className={INPUT_CLASSES}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cost-worked" className="text-[15px] font-semibold">
            How many you get to before the deadline: {workedPercent}%
          </label>
          <input
            id="cost-worked"
            type="range"
            min={0}
            max={100}
            step={5}
            value={workedPercent}
            onChange={(event) => setWorkedPercent(wholeNumberBetween(event.target.value, 100))}
            className="h-11 w-full accent-brand"
          />
        </div>
      </div>

      <div aria-live="polite" className="flex flex-col justify-center gap-3">
        <p className="m-0 text-lg text-subtle">
          {denialsNotWorked} denials a month pass their deadline untouched. That is
        </p>
        <p className="display m-0 text-[56px] text-ink sm:text-[88px]">
          <span className="marker">{formatCents(monthlyCents)}</span>
        </p>
        <p className="m-0 text-lg text-subtle">
          a month you billed for and never asked for twice, or {formatCents(yearlyCents)} a year.
        </p>
        <p className="m-0 max-w-[52ch] text-[15px] leading-relaxed text-muted">
          These are your numbers, not a promise. Not every denial can be won. But one that is never
          appealed is lost every time.
        </p>
      </div>
    </div>
  );
}
