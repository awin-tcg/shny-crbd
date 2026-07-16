import { describe, expect, it } from "vitest";
import { analyzeTrade } from "./trade.js";

describe("analyzeTrade", () => {
  it("applies 85% only to incoming cards and values cash at face value", () => {
    const result = analyzeTrade({
      yours: {
        lines: [{ quantity: 2, unitMarketCents: 5_000, stale: false }],
        cashCents: 1_500,
      },
      theirs: {
        lines: [{ quantity: 1, unitMarketCents: 12_000, stale: false }],
        cashCents: 2_000,
      },
      incomingCardAdjustmentBps: 8_500,
    });

    expect(result.yours.effectiveTotalCents).toBe(11_500);
    expect(result.theirs.rawCardMarketCents).toBe(12_000);
    expect(result.theirs.adjustedCardMarketCents).toBe(10_200);
    expect(result.theirs.effectiveTotalCents).toBe(12_200);
    expect(result.differenceCents).toBe(700);
    expect(result.differenceBps).toBe(609);
    expect(result.result).toBe("incoming-advantage");
  });

  it("excludes missing and stale prices while reporting their quantities", () => {
    const result = analyzeTrade({
      yours: {
        lines: [
          { quantity: 2, unitMarketCents: null, stale: false },
          { quantity: 3, unitMarketCents: 1_000, stale: true },
          { quantity: 1, unitMarketCents: 2_500, stale: false },
        ],
        cashCents: 0,
      },
      theirs: { lines: [], cashCents: 2_500 },
      incomingCardAdjustmentBps: 8_500,
    });

    expect(result.yours).toMatchObject({
      rawCardMarketCents: 2_500,
      pricedItems: 1,
      unpricedItems: 5,
      effectiveTotalCents: 2_500,
    });
    expect(result.result).toBe("balanced");
  });

  it("rounds adjusted values to the nearest cent deterministically", () => {
    const result = analyzeTrade({
      yours: { lines: [], cashCents: 0 },
      theirs: {
        lines: [{ quantity: 1, unitMarketCents: 101, stale: false }],
        cashCents: 0,
      },
      incomingCardAdjustmentBps: 8_500,
    });

    expect(result.theirs.adjustedCardMarketCents).toBe(86);
    expect(result.differenceBps).toBeNull();
    expect(result.result).toBe("incoming-advantage");
  });

  it("rejects invalid percentages, quantities, and unsafe totals", () => {
    const valid = {
      yours: { lines: [], cashCents: 0 },
      theirs: { lines: [], cashCents: 0 },
      incomingCardAdjustmentBps: 10_001,
    };
    expect(() => analyzeTrade(valid)).toThrow(RangeError);

    expect(() =>
      analyzeTrade({
        ...valid,
        incomingCardAdjustmentBps: 10_000,
        yours: {
          lines: [{ quantity: 0, unitMarketCents: 100, stale: false }],
          cashCents: 0,
        },
      }),
    ).toThrow(RangeError);
  });
});
