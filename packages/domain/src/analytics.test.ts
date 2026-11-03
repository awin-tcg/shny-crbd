import { describe, expect, it } from "vitest";
import {
  allocate,
  changeBps,
  pricedReturn,
  rankByReturn,
  ratioBps,
} from "./analytics.js";

describe("ratioBps", () => {
  it("rounds half away from zero and rejects empty denominators", () => {
    expect(ratioBps(1, 3)).toBe(3_333);
    expect(ratioBps(1, 20_000)).toBe(1);
    expect(ratioBps(-1, 20_000)).toBe(-1);
    expect(ratioBps(0, 500)).toBe(0);
    expect(ratioBps(10, 0)).toBeNull();
    expect(() => ratioBps(0.5, 10)).toThrow(RangeError);
  });

  it("measures change between two values", () => {
    expect(changeBps(41_400, 42_500)).toBe(266);
    expect(changeBps(73_100, 72_000)).toBe(-150);
    expect(changeBps(0, 500)).toBeNull();
  });
});

describe("pricedReturn", () => {
  it("excludes unpriced lines from both cost and value", () => {
    expect(
      pricedReturn([
        { costCents: 35_000, marketValueCents: 42_500 },
        { costCents: 5_000, marketValueCents: null },
      ]),
    ).toEqual({
      costCents: 35_000,
      marketValueCents: 42_500,
      gainLossCents: 7_500,
      returnBps: 2_143,
    });
    expect(pricedReturn([]).returnBps).toBeNull();
  });
});

describe("rankByReturn", () => {
  it("orders priced lines best first and skips free or unpriced lots", () => {
    const ranked = rankByReturn([
      { id: "a", costCents: 1_000, marketValueCents: 900 },
      { id: "b", costCents: 1_000, marketValueCents: 1_500 },
      { id: "c", costCents: 1_000, marketValueCents: null },
      { id: "d", costCents: 0, marketValueCents: 400 },
    ]);
    expect(ranked.map((line) => [line.id, line.returnBps])).toEqual([
      ["b", 5_000],
      ["a", -1_000],
    ]);
  });
});

describe("allocate", () => {
  it("merges groups and shares only priced value", () => {
    expect(
      allocate([
        { group: "pokemon", marketValueCents: 30_000 },
        { group: "yu-gi-oh", marketValueCents: 10_000 },
        { group: "pokemon", marketValueCents: 20_000 },
        { group: "gundam", marketValueCents: null },
      ]),
    ).toEqual([
      { group: "pokemon", marketValueCents: 50_000, shareBps: 8_333 },
      { group: "yu-gi-oh", marketValueCents: 10_000, shareBps: 1_667 },
    ]);
  });
});
