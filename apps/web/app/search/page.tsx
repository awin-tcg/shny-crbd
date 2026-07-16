"use client";

import type { Card, Game } from "@cardboard/contracts";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<Game | "">("");
  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState("Loading catalog…");
  const [loading, setLoading] = useState(false);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setStatus("Searching…");
    try {
      const params = new URLSearchParams({ q: query, limit: "24" });
      if (game) params.set("game", game);
      const response = await fetch(`${apiUrl}/v1/cards?${params}`, {
        headers: { "x-mock-user-id": "demo-user" },
      });
      if (!response.ok) throw new Error("Search is unavailable");
      const body = (await response.json()) as { items: Card[] };
      setCards(body.items);
      setStatus(
        body.items.length === 0
          ? "No cards matched those filters."
          : `${body.items.length} card${body.items.length === 1 ? "" : "s"} found`,
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
    // The initial catalog load intentionally runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Unified catalog</p>
          <h1>Find the exact card.</h1>
          <p className="lead">
            Search across games, then choose the condition or grade that matches
            what you actually own.
          </p>
        </div>
      </section>

      <form className="search-controls" onSubmit={search}>
        <label>
          Card, set, or number
          <input
            type="search"
            value={query}
            maxLength={120}
            placeholder="Charizard, OP05-119…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Game
          <select
            value={game}
            onChange={(event) => setGame(event.target.value as Game | "")}
          >
            <option value="">All games</option>
            <option value="pokemon">Pokémon</option>
            <option value="one-piece">One Piece</option>
            <option value="gundam">Gundam</option>
            <option value="yu-gi-oh">Yu-Gi-Oh!</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <p className="subtle" role="status" aria-live="polite">
        {status}
      </p>
      <section className="result-grid" aria-label="Search results">
        {cards.map((card) => (
          <CardResult card={card} key={card.id} />
        ))}
      </section>
    </>
  );
}

function CardResult({ card }: { card: Card }) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(card.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCard() {
    const parsedQuantity = Number(quantity);
    const dollars = Number(cost);
    if (
      !variantId ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1 ||
      !Number.isFinite(dollars) ||
      dollars < 0
    ) {
      setStatus("Enter a valid quantity and total cost.");
      return;
    }
    setSaving(true);
    setStatus("Adding…");
    try {
      const response = await fetch(`${apiUrl}/v1/lots`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
          "x-mock-user-id": "demo-user",
        },
        body: JSON.stringify({
          cardId: card.id,
          variantId,
          quantity: parsedQuantity,
          purchaseDate: new Date().toISOString().slice(0, 10),
          totalCostCents: Math.round(dollars * 100),
        }),
      });
      if (!response.ok) throw new Error("Could not add card");
      setStatus("Added to your portfolio.");
      router.refresh();
    } catch {
      setStatus("Could not add this card. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const selected = card.variants.find((variant) => variant.id === variantId);

  return (
    <article className="panel card-result">
      <img src={card.imageUrl} alt={`${card.name} card`} />
      <div>
        <h2>{card.name}</h2>
        <div className="subtle">
          {card.setName} · {card.number}
        </div>
        <label>
          Variant
          <select
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
          >
            {card.variants.map((variant) => (
              <option value={variant.id} key={variant.id}>
                {variantLabel(variant.descriptor)} ·{" "}
                {variant.marketCents === null
                  ? "Unpriced"
                  : money(variant.marketCents)}
              </option>
            ))}
          </select>
        </label>
        {selected?.stale && (
          <p className="price-warning" role="note">
            Stale price · this card will remain unpriced in portfolio totals.
          </p>
        )}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <label>
            Quantity
            <input
              inputMode="numeric"
              min="1"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label>
            Total cost (USD)
            <input
              inputMode="decimal"
              min="0"
              step="0.01"
              type="number"
              placeholder="0.00"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
          </label>
        </div>
        <button onClick={addCard} disabled={saving || !variantId} type="button">
          {saving ? "Adding…" : "Add to portfolio"}
        </button>
        <p className="subtle" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </article>
  );
}

function variantLabel(
  descriptor: Card["variants"][number]["descriptor"],
): string {
  return descriptor.kind === "raw"
    ? descriptor.condition.replaceAll("_", " ")
    : `${descriptor.grader} ${descriptor.grade}`;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
