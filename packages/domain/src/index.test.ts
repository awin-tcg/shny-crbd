import { describe, expect, it } from "vitest";
import { finalizeValuation, valuePortfolio } from "./index.js";

describe("valuePortfolio", () => {
  it("uses exact integer arithmetic and excludes stale prices", () => {
    const result = finalizeValuation(
      valuePortfolio([
        {
          quantity: 2,
          totalCostCents: 1_000,
          unitMarketCents: 750,
          stale: false,
        },
        { quantity: 1, totalCostCents: 250, unitMarketCents: 500, stale: true },
      ]),
    );

    expect(result).toEqual({
      marketValueCents: 1_500,
      costBasisCents: 1_250,
      gainLossCents: 250,
      valuedItems: 2,
      unpricedItems: 1,
    });
  });

  it("rejects unsafe or invalid monetary inputs", () => {
    expect(() =>
      valuePortfolio([
        { quantity: 0, totalCostCents: 100, unitMarketCents: 1, stale: false },
      ]),
    ).toThrow(RangeError);
  });
});
