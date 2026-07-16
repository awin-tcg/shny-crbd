import type { Card, Portfolio, PortfolioSnapshot } from "@cardboard/contracts";
import { finalizeValuation, valuePortfolio } from "@cardboard/domain";
import type { MarketDataProvider } from "./market.js";
import type { InMemoryStore } from "./store.js";

export class PortfolioService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly market: MarketDataProvider,
  ) {}

  async getPortfolio(userId: string): Promise<Portfolio> {
    const lots = this.store.listLots(userId);
    const lines = (
      await Promise.all(
        lots.map(async (lot) => {
          const card = await this.market.getCard(lot.cardId);
          if (!card) return null;
          const variant = card.variants.find(
            (candidate) => candidate.id === lot.variantId,
          );
          if (!variant) return null;
          const marketValueCents =
            variant.marketCents === null || variant.stale
              ? null
              : variant.marketCents * lot.quantity;
          return {
            lot,
            card: withoutVariants(card),
            variant,
            marketValueCents,
            gainLossCents:
              marketValueCents === null
                ? null
                : marketValueCents - lot.totalCostCents,
          };
        }),
      )
    ).filter((line): line is NonNullable<typeof line> => line !== null);

    const totals = finalizeValuation(
      valuePortfolio(
        lines.map((line) => ({
          quantity: line.lot.quantity,
          totalCostCents: line.lot.totalCostCents,
          unitMarketCents: line.variant.marketCents,
          stale: line.variant.stale,
        })),
      ),
    );

    return {
      ...totals,
      lines,
      snapshots: this.store.listSnapshots(userId),
    };
  }

  async snapshot(
    userId: string,
    requestId: string,
    date = utcDate(),
  ): Promise<PortfolioSnapshot> {
    const portfolio = await this.getPortfolio(userId);
    const snapshot: PortfolioSnapshot = {
      date,
      marketValueCents: portfolio.marketValueCents,
      costBasisCents: portfolio.costBasisCents,
      valuedItems: portfolio.valuedItems,
      unpricedItems: portfolio.unpricedItems,
    };
    this.store.saveSnapshot(userId, snapshot, requestId);
    return snapshot;
  }
}

function withoutVariants(card: Card): Omit<Card, "variants"> {
  const { variants: _variants, ...metadata } = card;
  return metadata;
}

function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}
