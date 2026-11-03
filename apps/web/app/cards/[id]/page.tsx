import type { Card, Portfolio } from "@cardboard/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddLotForm } from "../../../components/add-lot-form";
import { CardMarketTabs } from "../../../components/card-market-tabs";
import { gameLabel } from "../../../lib/format";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);
  return { title: card ? `${card.name} · ${card.setName}` : "Card" };
}

export default async function CardDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!uuid.test(id)) notFound();

  const [card, portfolio] = await Promise.all([getCard(id), getPortfolio()]);
  if (card === null) notFound();
  if (card === undefined) {
    return (
      <div className="notice warning" role="alert">
        The catalog API is unavailable. Start the API on port 4000 and refresh.
      </div>
    );
  }

  const holdings = (portfolio?.lines ?? [])
    .filter((line) => line.card.id === card.id)
    .map((line) => ({
      lotId: line.lot.id,
      variant: line.variant,
      quantity: line.lot.quantity,
      totalCostCents: line.lot.totalCostCents,
      marketValueCents: line.marketValueCents,
    }));

  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/search">← Back to search</Link>
      </nav>

      <section className="card-hero">
        {/* External catalog artwork is display-only and provider-attributed. */}
        <img src={card.imageUrl} alt={`${card.name} card artwork`} />
        <div className="card-hero-body">
          <p className="eyebrow">{gameLabel(card.game)}</p>
          <h1>{card.name}</h1>
          <dl className="card-facts">
            <div>
              <dt>Set</dt>
              <dd>{card.setName}</dd>
            </div>
            <div>
              <dt>Number</dt>
              <dd>{card.number}</dd>
            </div>
            <div>
              <dt>Rarity</dt>
              <dd>{card.rarity}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{card.language}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="card-detail-grid">
        <CardMarketTabs card={card} holdings={holdings} />
        <aside
          className="panel add-lot-panel"
          aria-labelledby="add-lot-heading"
        >
          <p className="eyebrow">Track it</p>
          <h2 id="add-lot-heading">Add to portfolio</h2>
          <AddLotForm card={card} />
        </aside>
      </div>
    </>
  );
}

/** `null` = card does not exist, `undefined` = API unreachable. */
async function getCard(id: string): Promise<Card | null | undefined> {
  try {
    const response = await fetch(`${baseUrl}/v1/cards/${id}`, {
      cache: "no-store",
      headers: { "x-mock-user-id": "demo-user" },
    });
    if (response.status === 404) return null;
    if (!response.ok) return undefined;
    return (await response.json()) as Card;
  } catch {
    return undefined;
  }
}

async function getPortfolio(): Promise<Portfolio | null> {
  try {
    const response = await fetch(`${baseUrl}/v1/portfolio`, {
      cache: "no-store",
      headers: { "x-mock-user-id": "demo-user" },
    });
    if (!response.ok) return null;
    return (await response.json()) as Portfolio;
  } catch {
    return null;
  }
}
