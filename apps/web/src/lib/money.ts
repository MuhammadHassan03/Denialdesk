const CENTS_PER_DOLLAR = 100;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCents(amountCents: number): string {
  if (!Number.isInteger(amountCents)) {
    throw new Error(`Money must be a whole number of cents, got ${amountCents}`);
  }
  const amountDollars = amountCents / CENTS_PER_DOLLAR;
  return usdFormatter.format(amountDollars);
}
