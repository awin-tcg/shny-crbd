import type { Card, Game } from "@cardboard/contracts";
import { cards as fixtureCards } from "@cardboard/test-data";

export interface CardSearch {
  query: string;
  game?: Game;
  limit: number;
}

export interface MarketDataProvider {
  search(input: CardSearch): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
}

export class MockMarketDataProvider implements MarketDataProvider {
  async search(input: CardSearch): Promise<Card[]> {
    const terms = normalize(input.query).split(/\s+/).filter(Boolean);
    return fixtureCards
      .filter((card) => !input.game || card.game === input.game)
      .filter((card) => {
        const haystack = normalize(
          `${card.name} ${card.setName} ${card.number} ${card.rarity} ${card.language}`,
        );
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, input.limit)
      .map((card) => structuredClone(card));
  }

  async getCard(id: string): Promise<Card | null> {
    const card = fixtureCards.find((candidate) => candidate.id === id);
    return card ? structuredClone(card) : null;
  }
}

export class ScrydexMarketDataProvider implements MarketDataProvider {
  async search(_input: CardSearch): Promise<Card[]> {
    throw new Error(
      "Scrydex is gated pending API contract and redistribution approval",
    );
  }

  async getCard(_id: string): Promise<Card | null> {
    throw new Error(
      "Scrydex is gated pending API contract and redistribution approval",
    );
  }
}

export function createMarketDataProvider(
  environment: string,
): MarketDataProvider {
  const adapter = process.env.MARKET_DATA_ADAPTER ?? "mock";
  if (environment === "production" && adapter === "mock") {
    throw new Error("MARKET_DATA_ADAPTER=mock is forbidden in production");
  }
  if (adapter === "scrydex") return new ScrydexMarketDataProvider();
  if (adapter === "mock") return new MockMarketDataProvider();
  throw new Error(`Unknown market data adapter "${adapter}"`);
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
