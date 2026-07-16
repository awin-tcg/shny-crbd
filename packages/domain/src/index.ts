export interface ValuationInput {
  quantity: number;
  totalCostCents: number;
  unitMarketCents: number | null;
  stale: boolean;
}

export interface ValuationResult {
  marketValueCents: number;
  costBasisCents: number;
  gainLossCents: number;
  valuedItems: number;
  unpricedItems: number;
}

export function valuePortfolio(
  lines: readonly ValuationInput[],
): ValuationResult {
  return lines.reduce<ValuationResult>(
    (total, line) => {
      assertSafeInteger(line.quantity, "quantity");
      assertSafeInteger(line.totalCostCents, "totalCostCents");
      if (line.quantity < 1 || line.totalCostCents < 0) {
        throw new RangeError(
          "Quantity must be positive and cost cannot be negative",
        );
      }

      total.costBasisCents = addMoney(
        total.costBasisCents,
        line.totalCostCents,
      );
      if (line.unitMarketCents === null || line.stale) {
        total.unpricedItems += line.quantity;
        return total;
      }

      assertSafeInteger(line.unitMarketCents, "unitMarketCents");
      if (line.unitMarketCents < 0)
        throw new RangeError("Market value cannot be negative");
      const market = multiplyMoney(line.unitMarketCents, line.quantity);
      total.marketValueCents = addMoney(total.marketValueCents, market);
      total.valuedItems += line.quantity;
      return total;
    },
    {
      marketValueCents: 0,
      costBasisCents: 0,
      gainLossCents: 0,
      valuedItems: 0,
      unpricedItems: 0,
    },
  );
}

export function finalizeValuation(result: ValuationResult): ValuationResult {
  return {
    ...result,
    gainLossCents: result.marketValueCents - result.costBasisCents,
  };
}

function addMoney(left: number, right: number): number {
  const result = left + right;
  assertSafeInteger(result, "money total");
  return result;
}

function multiplyMoney(cents: number, quantity: number): number {
  const result = cents * quantity;
  assertSafeInteger(result, "money product");
  return result;
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value))
    throw new RangeError(`${label} must be a safe integer`);
}
