"use client";

import type { Card, Game } from "@cardboard/contracts";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AddLotForm } from "../../components/add-lot-form";

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
  return (
    <article className="panel card-result">
      <Link href={`/cards/${card.id}`} aria-label={`View ${card.name} details`}>
        <img src={card.imageUrl} alt="" />
      </Link>
      <div>
        <h2>
          <Link href={`/cards/${card.id}`}>{card.name}</Link>
        </h2>
        <div className="subtle">
          {card.setName} · {card.number}
        </div>
        <AddLotForm card={card} />
        <Link className="detail-link" href={`/cards/${card.id}`}>
          View market data →
        </Link>
      </div>
    </article>
  );
}
