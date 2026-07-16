import type { Portfolio } from "@cardboard/contracts";
import Link from "next/link";
import { PortfolioChart } from "../components/portfolio-chart";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const portfolio = await getPortfolio();

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Private portfolio</p>
          <h1>Know what you hold.</h1>
          <p className="lead">
            Exact variant pricing, visible freshness, and no mystery math.
          </p>
        </div>
        <Link className="button" href="/search">
          Add cards
        </Link>
      </section>

      {!portfolio ? (
        <div className="notice warning" role="alert">
          The portfolio API is unavailable. Start the API on port 4000 and
          refresh.
        </div>
      ) : (
        <Dashboard portfolio={portfolio} />
      )}
    </>
  );
}

function Dashboard({ portfolio }: { portfolio: Portfolio }) {
  const gainClass = portfolio.gainLossCents >= 0 ? "positive" : "negative";
  return (
    <>
      <section className="metric-grid panel" aria-label="Portfolio totals">
        <Metric
          label="Market value"
          value={money(portfolio.marketValueCents)}
        />
        <Metric label="Cost basis" value={money(portfolio.costBasisCents)} />
        <Metric
          label="Unrealized gain"
          value={signedMoney(portfolio.gainLossCents)}
          className={gainClass}
        />
        <Metric
          label="Priced cards"
          value={portfolio.valuedItems.toLocaleString("en-US")}
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="chart-header">
            <div>
              <p className="eyebrow">Value history</p>
              <h2>Portfolio movement</h2>
            </div>
            <span className="subtle">Daily · USD</span>
          </div>
          <PortfolioChart snapshots={portfolio.snapshots} />
        </article>

        <aside className="panel summary-panel">
          <p className="eyebrow">Data quality</p>
          <h2>Valuation coverage</h2>
          <ul className="summary-list">
            <li>
              <span>Priced items</span>
              <strong>{portfolio.valuedItems}</strong>
            </li>
            <li>
              <span>Missing or stale</span>
              <strong>{portfolio.unpricedItems}</strong>
            </li>
            <li>
              <span>Currency</span>
              <strong>USD</strong>
            </li>
            <li>
              <span>Method</span>
              <strong>Exact variant</strong>
            </li>
          </ul>
        </aside>

        <article className="panel holdings-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Collection</p>
              <h2>Holdings</h2>
            </div>
            <Link href="/search">Find another card →</Link>
          </div>
          {portfolio.lines.length === 0 ? (
            <div className="empty-state">
              No cards yet. Search the catalog to add your first acquisition.
            </div>
          ) : (
            portfolio.lines.map((line) => (
              <div className="holding" key={line.lot.id}>
                {/* External catalog artwork is display-only and provider-attributed. */}
                <img src={line.card.imageUrl} alt="" />
                <div>
                  <div className="holding-name">{line.card.name}</div>
                  <small>
                    {line.card.setName} ·{" "}
                    {variantLabel(line.variant.descriptor)} · Qty{" "}
                    {line.lot.quantity}
                  </small>
                </div>
                <div>
                  <small>Market</small>
                  <div className="money">
                    {line.marketValueCents === null
                      ? "Unpriced"
                      : money(line.marketValueCents)}
                  </div>
                </div>
                <div>
                  <small>Cost</small>
                  <div className="money">{money(line.lot.totalCostCents)}</div>
                </div>
                <div>
                  <small>Gain / loss</small>
                  <div
                    className={`money ${(line.gainLossCents ?? 0) >= 0 ? "positive" : "negative"}`}
                  >
                    {line.gainLossCents === null
                      ? "—"
                      : signedMoney(line.gainLossCents)}
                  </div>
                </div>
              </div>
            ))
          )}
        </article>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${className}`}>{value}</span>
    </div>
  );
}

function variantLabel(
  descriptor:
    | { kind: "raw"; condition: string }
    | { kind: "graded"; grader: string; grade: string },
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

function signedMoney(cents: number): string {
  return `${cents >= 0 ? "+" : "−"}${money(Math.abs(cents))}`;
}

async function getPortfolio(): Promise<Portfolio | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
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
