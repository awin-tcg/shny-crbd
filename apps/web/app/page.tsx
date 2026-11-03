import type { Portfolio } from "@cardboard/contracts";
import Link from "next/link";
import { PortfolioChart } from "../components/portfolio-chart";
import { PortfolioOnboarding } from "../components/portfolio-onboarding";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const portfolio = await getPortfolio();

  return (
    <>
      <section className="portfolio-heading">
        <h1>Portfolio</h1>
        <Link className="button" href="/search">
          Add cards
        </Link>
      </section>
      <PortfolioOnboarding />

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
  const firstSnapshot = portfolio.snapshots[0];
  const latestSnapshot = portfolio.snapshots.at(-1);
  const totalItems = portfolio.valuedItems + portfolio.unpricedItems;

  return (
    <>
      <section
        className="metric-grid panel"
        aria-label="Portfolio totals"
        data-dashboard-section="totals"
      >
        <Metric
          label="Market value"
          value={money(portfolio.marketValueCents)}
        />
        <Metric
          label="Unrealized gain"
          value={signedMoney(portfolio.gainLossCents)}
          className={gainClass}
        />
        <Metric label="Cost basis" value={money(portfolio.costBasisCents)} />
        <Metric
          label="Priced cards"
          value={`${portfolio.valuedItems.toLocaleString("en-US")} of ${totalItems.toLocaleString("en-US")}`}
          detail={
            portfolio.unpricedItems > 0
              ? `${portfolio.unpricedItems.toLocaleString("en-US")} missing or stale · excluded from totals`
              : "Exact variant · USD"
          }
        />
      </section>

      <section className="dashboard-grid">
        <article
          className="panel chart-panel"
          data-dashboard-section="chart"
          aria-labelledby="portfolio-movement-heading"
        >
          <div className="chart-header">
            <div>
              <p className="eyebrow">Value history</p>
              <h2 id="portfolio-movement-heading">Portfolio movement</h2>
            </div>
            <span className="chart-period">
              <span>Daily · USD</span>
              {latestSnapshot && (
                <span>
                  Latest snapshot{" "}
                  <time dateTime={latestSnapshot.date}>
                    {shortDate(latestSnapshot.date)}
                  </time>
                </span>
              )}
            </span>
          </div>
          <PortfolioChart snapshots={portfolio.snapshots} />
          {firstSnapshot && latestSnapshot && (
            <div className="chart-caption">
              <span>
                Period {shortDate(firstSnapshot.date)}–
                {shortDate(latestSnapshot.date)}
              </span>
              <span>Latest {money(latestSnapshot.marketValueCents)}</span>
            </div>
          )}
        </article>

        <article
          className="panel holdings-panel"
          data-dashboard-section="holdings"
        >
          <div className="section-header">
            <div>
              <p className="eyebrow">Collection</p>
              <h2>Holdings</h2>
            </div>
            <span className="subtle">
              {portfolio.lines.length.toLocaleString("en-US")}{" "}
              {portfolio.lines.length === 1 ? "lot" : "lots"}
            </span>
          </div>
          {portfolio.lines.length === 0 ? (
            <div className="empty-state">
              No cards yet. <Link href="/search">Search the catalog</Link> to
              add your first acquisition.
            </div>
          ) : (
            portfolio.lines.map((line) => (
              <div className="holding" key={line.lot.id}>
                {/* External catalog artwork is display-only and provider-attributed. */}
                <img src={line.card.imageUrl} alt="" />
                <div>
                  <div className="holding-name">
                    <Link href={`/cards/${line.card.id}`}>
                      {line.card.name}
                    </Link>
                  </div>
                  <small>
                    {line.card.setName} ·{" "}
                    {variantLabel(line.variant.descriptor)} · Qty{" "}
                    {line.lot.quantity}
                  </small>
                </div>
                <div>
                  <small>Market</small>
                  <div
                    className={`money ${line.marketValueCents === null ? "unpriced" : ""}`}
                  >
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
  detail,
  className = "",
}: {
  label: string;
  value: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${className}`}>{value}</span>
      {detail && <span className="metric-sub">{detail}</span>}
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

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
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
