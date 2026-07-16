export const MAX_TRADE_QUANTITY = 100_000;
export const MAX_TRADE_CASH_CENTS = 2_147_483_647;
export const MAX_INCOMING_ADJUSTMENT_BPS = 10_000;

export interface TradeLineInput {
  quantity: number;
  unitMarketCents: number | null;
  stale: boolean;
}

export interface TradeSideInput {
  lines: readonly TradeLineInput[];
  cashCents: number;
}

export interface TradeAnalysisInput {
  yours: TradeSideInput;
  theirs: TradeSideInput;
  incomingCardAdjustmentBps: number;
}

export interface TradeSideSummary {
  rawCardMarketCents: number;
  cashCents: number;
  pricedItems: number;
  unpricedItems: number;
}

export interface TradeAnalysis {
  yours: TradeSideSummary & { effectiveTotalCents: number };
  theirs: TradeSideSummary & {
    adjustedCardMarketCents: number;
    effectiveTotalCents: number;
  };
  differenceCents: number;
  differenceBps: number | null;
  result: "balanced" | "incoming-advantage" | "outgoing-advantage";
}

/**
 * Compares a collector's outgoing cards and cash with incoming cards and cash.
 * Only incoming card market value is adjusted. Missing and stale prices are
 * counted but intentionally excluded from every monetary total.
 */
export function analyzeTrade(input: TradeAnalysisInput): TradeAnalysis {
  assertIntegerInRange(
    input.incomingCardAdjustmentBps,
    0,
    MAX_INCOMING_ADJUSTMENT_BPS,
    "incomingCardAdjustmentBps",
  );

  const yours = summarizeSide(input.yours);
  const theirs = summarizeSide(input.theirs);
  const adjustedCardMarketCents = scaleCents(
    theirs.rawCardMarketCents,
    input.incomingCardAdjustmentBps,
  );
  const yourEffectiveTotalCents = addMoney(
    yours.rawCardMarketCents,
    yours.cashCents,
  );
  const theirEffectiveTotalCents = addMoney(
    adjustedCardMarketCents,
    theirs.cashCents,
  );
  const differenceCents = subtractMoney(
    theirEffectiveTotalCents,
    yourEffectiveTotalCents,
  );

  return {
    yours: { ...yours, effectiveTotalCents: yourEffectiveTotalCents },
    theirs: {
      ...theirs,
      adjustedCardMarketCents,
      effectiveTotalCents: theirEffectiveTotalCents,
    },
    differenceCents,
    differenceBps:
      yourEffectiveTotalCents === 0
        ? null
        : ratioToBasisPoints(differenceCents, yourEffectiveTotalCents),
    result:
      differenceCents === 0
        ? "balanced"
        : differenceCents > 0
          ? "incoming-advantage"
          : "outgoing-advantage",
  };
}

function summarizeSide(input: TradeSideInput): TradeSideSummary {
  assertIntegerInRange(input.cashCents, 0, MAX_TRADE_CASH_CENTS, "cashCents");

  return input.lines.reduce<TradeSideSummary>(
    (summary, line) => {
      assertIntegerInRange(line.quantity, 1, MAX_TRADE_QUANTITY, "quantity");
      if (line.unitMarketCents === null || line.stale) {
        summary.unpricedItems = addCount(summary.unpricedItems, line.quantity);
        return summary;
      }

      assertIntegerInRange(
        line.unitMarketCents,
        0,
        MAX_TRADE_CASH_CENTS,
        "unitMarketCents",
      );
      summary.rawCardMarketCents = addMoney(
        summary.rawCardMarketCents,
        multiplyMoney(line.unitMarketCents, line.quantity),
      );
      summary.pricedItems = addCount(summary.pricedItems, line.quantity);
      return summary;
    },
    {
      rawCardMarketCents: 0,
      cashCents: input.cashCents,
      pricedItems: 0,
      unpricedItems: 0,
    },
  );
}

function scaleCents(cents: number, basisPoints: number): number {
  return bigintToSafeInteger(
    divideRoundNearest(BigInt(cents) * BigInt(basisPoints), 10_000n),
    "adjusted card value",
  );
}

function ratioToBasisPoints(numerator: number, denominator: number): number {
  return bigintToSafeInteger(
    divideRoundNearest(BigInt(numerator) * 10_000n, BigInt(denominator)),
    "percentage difference",
  );
}

function divideRoundNearest(numerator: bigint, denominator: bigint): bigint {
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return sign * ((absolute + denominator / 2n) / denominator);
}

function addMoney(left: number, right: number): number {
  return bigintToSafeInteger(BigInt(left) + BigInt(right), "money total");
}

function subtractMoney(left: number, right: number): number {
  return bigintToSafeInteger(BigInt(left) - BigInt(right), "money difference");
}

function multiplyMoney(cents: number, quantity: number): number {
  return bigintToSafeInteger(BigInt(cents) * BigInt(quantity), "money product");
}

function addCount(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError("item count must be a safe integer");
  }
  return result;
}

function bigintToSafeInteger(value: bigint, label: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`${label} must be a safe integer`);
  }
  return result;
}

function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${label} must be an integer from ${minimum} to ${maximum}`,
    );
  }
}
