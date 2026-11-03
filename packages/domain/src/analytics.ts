export interface PricedLineInput {
  costCents: number;
  marketValueCents: number | null;
}

export interface PricedReturn {
  costCents: number;
  marketValueCents: number;
  gainLossCents: number;
  returnBps: number | null;
}

export interface AllocationInput {
  group: string;
  marketValueCents: number | null;
}

export interface AllocationSlice {
  group: string;
  marketValueCents: number;
  shareBps: number;
}

/**
 * Expresses part / whole in basis points (1% = 100 bps), rounded half away
 * from zero. Returns null when the whole is not positive.
 */
export function ratioBps(part: number, whole: number): number | null {
  assertSafeInteger(part, "part");
  assertSafeInteger(whole, "whole");
  if (whole <= 0) return null;
  const scaled = Math.abs(part) * 10_000;
  assertSafeInteger(scaled, "scaled ratio");
  return Math.sign(part) * Math.round(scaled / whole) || 0;
}

export function changeBps(fromCents: number, toCents: number): number | null {
  return ratioBps(toCents - fromCents, fromCents);
}

/** Gain and return over priced lines only; unpriced cost is not included. */
export function pricedReturn(lines: readonly PricedLineInput[]): PricedReturn {
  let costCents = 0;
  let marketValueCents = 0;
  for (const line of lines) {
    if (line.marketValueCents === null) continue;
    costCents = add(costCents, line.costCents);
    marketValueCents = add(marketValueCents, line.marketValueCents);
  }
  const gainLossCents = marketValueCents - costCents;
  return {
    costCents,
    marketValueCents,
    gainLossCents,
    returnBps: ratioBps(gainLossCents, costCents),
  };
}

/** Ranks priced lines with a positive cost by return; unpriced lines are skipped. */
export function rankByReturn<T extends PricedLineInput>(
  lines: readonly T[],
): (T & { returnBps: number })[] {
  return lines
    .flatMap((line) => {
      if (line.marketValueCents === null) return [];
      const returnBps = ratioBps(
        line.marketValueCents - line.costCents,
        line.costCents,
      );
      return returnBps === null ? [] : [{ ...line, returnBps }];
    })
    .sort((left, right) => right.returnBps - left.returnBps);
}

/** Groups priced value and shares of the priced total, largest first. */
export function allocate(
  entries: readonly AllocationInput[],
): AllocationSlice[] {
  const groups = new Map<string, number>();
  let total = 0;
  for (const entry of entries) {
    if (entry.marketValueCents === null) continue;
    groups.set(
      entry.group,
      add(groups.get(entry.group) ?? 0, entry.marketValueCents),
    );
    total = add(total, entry.marketValueCents);
  }
  return [...groups]
    .map(([group, marketValueCents]) => ({
      group,
      marketValueCents,
      shareBps: ratioBps(marketValueCents, total) ?? 0,
    }))
    .sort((left, right) => right.marketValueCents - left.marketValueCents);
}

function add(left: number, right: number): number {
  assertSafeInteger(left, "money");
  assertSafeInteger(right, "money");
  const result = left + right;
  assertSafeInteger(result, "money total");
  return result;
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value))
    throw new RangeError(`${label} must be a safe integer`);
}
