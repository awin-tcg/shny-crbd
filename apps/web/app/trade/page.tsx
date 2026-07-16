"use client";

import type { Card, Game } from "@cardboard/contracts";
import {
  analyzeTrade,
  MAX_TRADE_CASH_CENTS,
  MAX_TRADE_QUANTITY,
} from "@cardboard/domain";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const games: ReadonlyArray<{ value: Game; label: string }> = [
  { value: "pokemon", label: "Pokémon" },
  { value: "one-piece", label: "One Piece" },
  { value: "gundam", label: "Gundam" },
  { value: "yu-gi-oh", label: "Yu-Gi-Oh!" },
];

type TradeSide = "yours" | "theirs";
type CardVariant = Card["variants"][number];

interface TradeItem {
  key: string;
  cardId: string;
  name: string;
  setName: string;
  number: string;
  imageUrl: string;
  variant: CardVariant;
  quantity: number;
}

export default function TradePage() {
  const [yourItems, setYourItems] = useState<TradeItem[]>([]);
  const [theirItems, setTheirItems] = useState<TradeItem[]>([]);
  const [yourCash, setYourCash] = useState("");
  const [theirCash, setTheirCash] = useState("");
  const [percentage, setPercentage] = useState(85);

  const yourCashCents = parseMoney(yourCash);
  const theirCashCents = parseMoney(theirCash);
  const analysis = useMemo(
    () =>
      analyzeTrade({
        yours: {
          lines: yourItems.map(toTradeLine),
          cashCents: yourCashCents ?? 0,
        },
        theirs: {
          lines: theirItems.map(toTradeLine),
          cashCents: theirCashCents ?? 0,
        },
        incomingCardAdjustmentBps: percentage * 100,
      }),
    [percentage, theirCashCents, theirItems, yourCashCents, yourItems],
  );

  function addItem(side: TradeSide, card: Card, variant: CardVariant) {
    const setter = side === "yours" ? setYourItems : setTheirItems;
    setter((items) => {
      const key = `${card.id}:${variant.id}`;
      const existing = items.find((item) => item.key === key);
      if (existing) {
        return items.map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, MAX_TRADE_QUANTITY),
              }
            : item,
        );
      }
      return [
        ...items,
        {
          key,
          cardId: card.id,
          name: card.name,
          setName: card.setName,
          number: card.number,
          imageUrl: card.imageUrl,
          variant,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(side: TradeSide, key: string, quantity: number) {
    if (!Number.isInteger(quantity)) return;
    const bounded = Math.min(MAX_TRADE_QUANTITY, Math.max(1, quantity));
    const setter = side === "yours" ? setYourItems : setTheirItems;
    setter((items) =>
      items.map((item) =>
        item.key === key ? { ...item, quantity: bounded } : item,
      ),
    );
  }

  function removeItem(side: TradeSide, key: string) {
    const setter = side === "yours" ? setYourItems : setTheirItems;
    setter((items) => items.filter((item) => item.key !== key));
  }

  const hasInvalidCash = yourCashCents === null || theirCashCents === null;
  const missingCount =
    analysis.yours.unpricedItems + analysis.theirs.unpricedItems;

  return (
    <>
      <section className="page-heading trade-heading">
        <div>
          <p className="eyebrow">Temporary analysis</p>
          <h1>Price the whole trade.</h1>
          <p className="lead">
            Compare exact card variants and cash without changing your
            portfolio. Nothing on this page is saved.
          </p>
        </div>
      </section>

      <section className="trade-sides" aria-label="Trade items">
        <TradeSidePanel
          side="yours"
          title="Your side"
          description="Cards and cash you give"
          items={yourItems}
          cash={yourCash}
          cashValid={yourCashCents !== null}
          onCashChange={setYourCash}
          onAdd={addItem}
          onQuantityChange={updateQuantity}
          onRemove={removeItem}
        />
        <TradeSidePanel
          side="theirs"
          title="Other side"
          description="Cards and cash you receive"
          items={theirItems}
          cash={theirCash}
          cashValid={theirCashCents !== null}
          onCashChange={setTheirCash}
          onAdd={addItem}
          onQuantityChange={updateQuantity}
          onRemove={removeItem}
        />
      </section>

      <section
        className="panel trade-analysis"
        aria-labelledby="analysis-title"
      >
        <div className="trade-analysis-header">
          <div>
            <p className="eyebrow">Trade analysis</p>
            <h2 id="analysis-title">Value comparison</h2>
          </div>
          <div className="percentage-control">
            <label htmlFor="incoming-percentage">
              Incoming card value
              <strong>{percentage}%</strong>
            </label>
            <div>
              <input
                id="incoming-percentage"
                type="range"
                min="0"
                max="100"
                step="1"
                value={percentage}
                onChange={(event) => setPercentage(Number(event.target.value))}
              />
              <input
                aria-label="Incoming card value percentage"
                className="percentage-number"
                type="number"
                min="0"
                max="100"
                step="1"
                value={percentage}
                onChange={(event) =>
                  setPercentage(clampPercentage(event.target.value))
                }
              />
            </div>
            <small>Applies only to other-side cards. Cash stays at 100%.</small>
          </div>
        </div>

        {hasInvalidCash && (
          <div className="notice warning" role="alert">
            Enter cash as USD with no more than two decimal places.
          </div>
        )}
        {missingCount > 0 && (
          <div className="notice warning" role="alert">
            {missingCount} card{missingCount === 1 ? "" : "s"}{" "}
            {missingCount === 1 ? "has" : "have"} a missing or stale price and{" "}
            {missingCount === 1 ? "is" : "are"} excluded from priced totals.
          </div>
        )}

        <div className="trade-summary-grid">
          <TradeSummary
            title="You give"
            rawCards={analysis.yours.rawCardMarketCents}
            cash={analysis.yours.cashCents}
            effective={analysis.yours.effectiveTotalCents}
            priced={analysis.yours.pricedItems}
            unpriced={analysis.yours.unpricedItems}
          />
          <TradeSummary
            title="You receive"
            rawCards={analysis.theirs.rawCardMarketCents}
            adjustedCards={analysis.theirs.adjustedCardMarketCents}
            adjustment={percentage}
            cash={analysis.theirs.cashCents}
            effective={analysis.theirs.effectiveTotalCents}
            priced={analysis.theirs.pricedItems}
            unpriced={analysis.theirs.unpricedItems}
          />
        </div>

        <div
          className={`trade-result ${analysis.result === "balanced" ? "" : analysis.differenceCents > 0 ? "positive" : "negative"}`}
          role="status"
          aria-live="polite"
        >
          <span>{resultLabel(analysis.result)}</span>
          <strong>{resultMessage(analysis.differenceCents)}</strong>
          <small>
            Difference: {signedMoney(analysis.differenceCents)}
            {" · "}
            {analysis.differenceBps === null
              ? "Percentage unavailable when your priced total is $0.00"
              : `${signedPercent(analysis.differenceBps)} of your priced total`}
          </small>
        </div>
      </section>
    </>
  );
}

function TradeSidePanel({
  side,
  title,
  description,
  items,
  cash,
  cashValid,
  onCashChange,
  onAdd,
  onQuantityChange,
  onRemove,
}: {
  side: TradeSide;
  title: string;
  description: string;
  items: TradeItem[];
  cash: string;
  cashValid: boolean;
  onCashChange: (value: string) => void;
  onAdd: (side: TradeSide, card: Card, variant: CardVariant) => void;
  onQuantityChange: (side: TradeSide, key: string, quantity: number) => void;
  onRemove: (side: TradeSide, key: string) => void;
}) {
  return (
    <article className="panel trade-side" aria-labelledby={`${side}-title`}>
      <div className="trade-side-header">
        <div>
          <h2 id={`${side}-title`}>{title}</h2>
          <p className="subtle">{description}</p>
        </div>
        <span className="item-count">
          {items.reduce((total, item) => total + item.quantity, 0)} cards
        </span>
      </div>

      <CatalogPicker side={side} onAdd={onAdd} />

      <div className="trade-item-list">
        {items.length === 0 ? (
          <div className="empty-state">
            Search and add an exact card variant.
          </div>
        ) : (
          items.map((item) => (
            <TradeItemRow
              key={item.key}
              item={item}
              side={side}
              onQuantityChange={onQuantityChange}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      <label className="cash-input">
        Cash (USD)
        <input
          aria-invalid={!cashValid}
          inputMode="decimal"
          placeholder="0.00"
          value={cash}
          onChange={(event) => onCashChange(event.target.value)}
        />
        <small>Cash is always counted at face value.</small>
      </label>
    </article>
  );
}

function CatalogPicker({
  side,
  onAdd,
}: {
  side: TradeSide;
  onAdd: (side: TradeSide, card: Card, variant: CardVariant) => void;
}) {
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<Game | "">("");
  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState("Loading catalog…");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setExpanded(true);
    setStatus("Searching…");
    try {
      const params = new URLSearchParams({ q: query, limit: "12" });
      if (game) params.set("game", game);
      const response = await fetch(`${apiUrl}/v1/cards?${params}`, {
        headers: { "x-mock-user-id": "demo-user" },
      });
      if (!response.ok) throw new Error("Search unavailable");
      const body = (await response.json()) as { items: Card[] };
      setCards(body.items);
      setStatus(
        body.items.length === 0
          ? "No cards matched those filters."
          : `${body.items.length} result${body.items.length === 1 ? "" : "s"}`,
      );
    } catch {
      setCards([]);
      setStatus("The catalog API is unavailable. Start the API and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void search();
    // Load deterministic catalog options once for this temporary picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="catalog-picker">
      <form className="trade-search" onSubmit={search}>
        <label>
          Search catalog
          <input
            aria-label={`Search ${side === "yours" ? "your" : "other"} side catalog`}
            type="search"
            maxLength={120}
            placeholder="Card, set, or number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Game
          <select
            aria-label={`${side === "yours" ? "Your" : "Other"} side game`}
            value={game}
            onChange={(event) => setGame(event.target.value as Game | "")}
          >
            <option value="">All games</option>
            {games.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {expanded && (
        <div className="catalog-results">
          <div className="catalog-results-heading">
            <span className="subtle" role="status" aria-live="polite">
              {status}
            </span>
            <button
              className="text-button"
              type="button"
              onClick={() => setExpanded(false)}
            >
              Close
            </button>
          </div>
          {cards.map((card) => (
            <CatalogResult
              card={card}
              key={card.id}
              side={side}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogResult({
  card,
  side,
  onAdd,
}: {
  card: Card;
  side: TradeSide;
  onAdd: (side: TradeSide, card: Card, variant: CardVariant) => void;
}) {
  const [variantId, setVariantId] = useState(card.variants[0]?.id ?? "");
  const variant = card.variants.find((candidate) => candidate.id === variantId);

  return (
    <div className="catalog-result">
      <img src={card.imageUrl} alt="" />
      <div>
        <strong>{card.name}</strong>
        <small>
          {card.setName} · {card.number}
        </small>
        <label>
          Exact variant
          <select
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
          >
            {card.variants.map((option) => (
              <option key={option.id} value={option.id}>
                {variantLabel(option.descriptor)} · {priceLabel(option)}
              </option>
            ))}
          </select>
        </label>
        {variant && (
          <small className={variant.stale ? "price-warning" : ""}>
            {freshnessLabel(variant)}
          </small>
        )}
      </div>
      <button
        type="button"
        disabled={!variant}
        onClick={() => variant && onAdd(side, card, variant)}
        aria-label={`Add ${card.name} to ${side === "yours" ? "your" : "other"} side`}
      >
        Add
      </button>
    </div>
  );
}

function TradeItemRow({
  item,
  side,
  onQuantityChange,
  onRemove,
}: {
  item: TradeItem;
  side: TradeSide;
  onQuantityChange: (side: TradeSide, key: string, quantity: number) => void;
  onRemove: (side: TradeSide, key: string) => void;
}) {
  const unpriced = item.variant.marketCents === null || item.variant.stale;

  return (
    <div className="trade-item">
      <img src={item.imageUrl} alt="" />
      <div className="trade-item-info">
        <strong>{item.name}</strong>
        <small>
          {item.setName} · {item.number}
        </small>
        <small>{variantLabel(item.variant.descriptor)}</small>
        <small className={unpriced ? "price-warning" : ""}>
          {unpriced
            ? `${item.variant.stale ? "Stale" : "Missing"} price · excluded`
            : `${money(item.variant.marketCents!)} each · ${freshnessLabel(item.variant)}`}
        </small>
      </div>
      <div className="quantity-control">
        <span>Quantity</span>
        <div>
          <button
            className="secondary"
            type="button"
            disabled={item.quantity <= 1}
            aria-label={`Decrease ${item.name} quantity`}
            onClick={() => onQuantityChange(side, item.key, item.quantity - 1)}
          >
            −
          </button>
          <input
            aria-label={`${item.name} quantity`}
            type="number"
            inputMode="numeric"
            min="1"
            max={MAX_TRADE_QUANTITY}
            value={item.quantity}
            onChange={(event) =>
              onQuantityChange(side, item.key, Number(event.target.value))
            }
          />
          <button
            className="secondary"
            type="button"
            disabled={item.quantity >= MAX_TRADE_QUANTITY}
            aria-label={`Increase ${item.name} quantity`}
            onClick={() => onQuantityChange(side, item.key, item.quantity + 1)}
          >
            +
          </button>
        </div>
      </div>
      <button
        className="text-button danger"
        type="button"
        onClick={() => onRemove(side, item.key)}
        aria-label={`Remove ${item.name} from ${side === "yours" ? "your" : "other"} side`}
      >
        Remove
      </button>
    </div>
  );
}

function TradeSummary({
  title,
  rawCards,
  adjustedCards,
  adjustment,
  cash,
  effective,
  priced,
  unpriced,
}: {
  title: string;
  rawCards: number;
  adjustedCards?: number;
  adjustment?: number;
  cash: number;
  effective: number;
  priced: number;
  unpriced: number;
}) {
  return (
    <article className="trade-summary">
      <h3>{title}</h3>
      <dl>
        <div>
          <dt>Raw card market</dt>
          <dd>{money(rawCards)}</dd>
        </div>
        {adjustedCards !== undefined && (
          <div>
            <dt>Adjusted cards ({adjustment}%)</dt>
            <dd>{money(adjustedCards)}</dd>
          </div>
        )}
        <div>
          <dt>Cash</dt>
          <dd>{money(cash)}</dd>
        </div>
        <div className="effective-total">
          <dt>Effective total</dt>
          <dd>{money(effective)}</dd>
        </div>
      </dl>
      <small className="subtle">
        {priced} priced · {unpriced} missing or stale
      </small>
    </article>
  );
}

function toTradeLine(item: TradeItem) {
  return {
    quantity: item.quantity,
    unitMarketCents: item.variant.marketCents,
    stale: item.variant.stale,
  };
}

function parseMoney(value: string): number | null {
  const normalized = value.trim();
  if (normalized === "") return 0;
  const match = /^(\d{1,8})(?:\.(\d{0,2}))?$/.exec(normalized);
  if (!match) return null;
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents <= MAX_TRADE_CASH_CENTS ? cents : null;
}

function clampPercentage(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function variantLabel(descriptor: CardVariant["descriptor"]): string {
  return descriptor.kind === "raw"
    ? descriptor.condition.replaceAll("_", " ")
    : `${descriptor.grader} ${descriptor.grade}`;
}

function priceLabel(variant: CardVariant): string {
  if (variant.marketCents === null) return "Missing price";
  if (variant.stale) return `${money(variant.marketCents)} stale`;
  return money(variant.marketCents);
}

function freshnessLabel(variant: CardVariant): string {
  if (variant.observedAt === null) return "No price observation available";
  const date = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(variant.observedAt));
  return variant.stale ? `Stale · observed ${date}` : `Observed ${date}`;
}

function resultLabel(
  result: ReturnType<typeof analyzeTrade>["result"],
): string {
  if (result === "balanced") return "Balanced";
  if (result === "incoming-advantage") return "Advantage: you";
  return "Advantage: other side";
}

function resultMessage(differenceCents: number): string {
  if (differenceCents === 0) {
    return "The priced effective totals are even.";
  }
  if (differenceCents > 0) {
    return `You receive ${money(differenceCents)} more in priced effective value.`;
  }
  return `You give ${money(Math.abs(differenceCents))} more in priced effective value.`;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function signedMoney(cents: number): string {
  if (cents === 0) return money(0);
  return `${cents > 0 ? "+" : "−"}${money(Math.abs(cents))}`;
}

function signedPercent(basisPoints: number): string {
  if (basisPoints === 0) return "0.00%";
  return `${basisPoints > 0 ? "+" : "−"}${(Math.abs(basisPoints) / 100).toFixed(2)}%`;
}
