import type {
  MarketTicker as MarketTickerData,
  Portfolio,
} from "@cardboard/contracts";
import {
  allocate,
  changeBps,
  pricedReturn,
  rankByReturn,
  ratioBps,
} from "@cardboard/domain";
import Link from "next/link";
import { HomeViewToggle } from "../components/home-view-toggle";
import { MarketTicker } from "../components/market-ticker";
import { PortfolioChart } from "../components/portfolio-chart";
import { PortfolioOnboarding } from "../components/portfolio-onboarding";
import {
  gameLabel,
  money,
  percent,
  shortDate,
  signedMoney,
  signedPercent,
  variantLabel,
} from "../lib/format";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type PortfolioLine = Portfolio["lines"][number];

export default async function PortfolioPage() {
  const [portfolio, ticker] = await Promise.all([getPortfolio(), getTicker()]);

  return (
    <>
      {ticker && <MarketTicker ticker={ticker} />}
      <section className="portfolio-heading">
        <h1>Portfolio</h1>
        <div className="portfolio-actions">
          <HomeViewToggle />
          <Link className="button" href="/search">
            Add cards
          </Link>
        </div>
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

      <Performance portfolio={portfolio} />

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

        <Breakdown portfolio={portfolio} />

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
                <HoldingDetails
                  line={line}
                  portfolioValueCents={portfolio.marketValueCents}
                />
              </div>
            ))
          )}
        </article>
      </section>
    </>
  );
}

function Performance({ portfolio }: { portfolio: Portfolio }) {
  const priced = pricedReturn(portfolio.lines.map(pricedInput));
  const ranked = rankByReturn(
    portfolio.lines.map((line) => ({ ...pricedInput(line), line })),
  );
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked.at(-1) : undefined;
  const snapshots = portfolio.snapshots;
  const first = snapshots[0];
  const previous = snapshots.at(-2);
  const latest = snapshots.at(-1);

  return (
    <section
      className="metric-grid panel advanced-only"
      aria-label="Advanced performance"
      data-dashboard-section="performance"
    >
      <Metric
        label="Return on cost"
        value={
          priced.returnBps === null ? "—" : signedPercent(priced.returnBps)
        }
        className={priced.gainLossCents >= 0 ? "positive" : "negative"}
        detail={`Priced lots only · ${signedMoney(priced.gainLossCents)} on ${money(priced.costCents)}`}
      />
      <SnapshotChange label="Since first snapshot" from={first} to={latest} />
      <SnapshotChange
        label="Since previous snapshot"
        from={previous}
        to={latest}
      />
      <Metric
        label="Best performer"
        value={best ? best.line.card.name : "—"}
        detail={
          best
            ? [
                `${signedPercent(best.returnBps)} · ${variantLabel(best.line.variant.descriptor)}`,
                worst
                  ? `Worst ${worst.line.card.name} ${signedPercent(worst.returnBps)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : "Needs a priced holding"
        }
      />
    </section>
  );
}

function SnapshotChange({
  label,
  from,
  to,
}: {
  label: string;
  from: Portfolio["snapshots"][number] | undefined;
  to: Portfolio["snapshots"][number] | undefined;
}) {
  if (!from || !to || from === to) {
    return <Metric label={label} value="—" detail="Needs two snapshots" />;
  }
  const delta = to.marketValueCents - from.marketValueCents;
  const bps = changeBps(from.marketValueCents, to.marketValueCents);
  return (
    <Metric
      label={label}
      value={signedMoney(delta)}
      className={delta >= 0 ? "positive" : "negative"}
      detail={`${bps === null ? "—" : signedPercent(bps)} · ${shortDate(from.date)} to ${shortDate(to.date)} · includes lot changes`}
    />
  );
}

function Breakdown({ portfolio }: { portfolio: Portfolio }) {
  const byGame = allocate(
    portfolio.lines.map((line) => ({
      group: gameLabel(line.card.game),
      marketValueCents: line.marketValueCents,
    })),
  );
  const byKind = allocate(
    portfolio.lines.map((line) => ({
      group: line.variant.descriptor.kind === "raw" ? "Raw" : "Graded",
      marketValueCents: line.marketValueCents,
    })),
  );
  const missingLines = portfolio.lines.filter(
    (line) => line.variant.marketCents === null,
  );
  const staleLines = portfolio.lines.filter(
    (line) => line.variant.marketCents !== null && line.variant.stale,
  );
  const quantity = (lines: PortfolioLine[]) =>
    lines.reduce((total, line) => total + line.lot.quantity, 0);
  const observed = portfolio.lines
    .filter((line) => line.marketValueCents !== null)
    .map((line) => line.variant.observedAt)
    .filter((date): date is string => date !== null)
    .sort();
  const excluded = [...missingLines, ...staleLines];

  return (
    <div
      className="breakdown-grid advanced-only"
      data-dashboard-section="breakdown"
    >
      <article
        className="panel summary-panel"
        aria-labelledby="allocation-heading"
      >
        <p className="eyebrow">Allocation</p>
        <h2 id="allocation-heading">Where the value sits</h2>
        <AllocationBars label="By game" slices={byGame} />
        <AllocationBars label="Raw vs graded" slices={byKind} />
        <p className="subtle allocation-note">
          Share of priced market value. Unpriced lots are not allocated.
        </p>
      </article>
      <article
        className="panel summary-panel"
        aria-labelledby="freshness-heading"
      >
        <p className="eyebrow">Coverage</p>
        <h2 id="freshness-heading">Price freshness</h2>
        <ul className="summary-list">
          <li>
            <span>Priced cards</span>
            <strong>
              {portfolio.valuedItems.toLocaleString("en-US")} of{" "}
              {(portfolio.valuedItems + portfolio.unpricedItems).toLocaleString(
                "en-US",
              )}
            </strong>
          </li>
          <li>
            <span>Missing price</span>
            <strong>{quantity(missingLines).toLocaleString("en-US")}</strong>
          </li>
          <li>
            <span>Stale price</span>
            <strong>{quantity(staleLines).toLocaleString("en-US")}</strong>
          </li>
          <li>
            <span>Price observations</span>
            <strong>
              {observed.length === 0 ? (
                "None"
              ) : observed[0]!.slice(0, 10) ===
                observed.at(-1)!.slice(0, 10) ? (
                <time dateTime={observed[0]}>{shortDate(observed[0]!)}</time>
              ) : (
                <>
                  <time dateTime={observed[0]}>{shortDate(observed[0]!)}</time>–
                  <time dateTime={observed.at(-1)}>
                    {shortDate(observed.at(-1)!)}
                  </time>
                </>
              )}
            </strong>
          </li>
        </ul>
        {excluded.length > 0 && (
          <ul className="excluded-list" aria-label="Excluded from totals">
            {excluded.map((line) => (
              <li key={line.lot.id}>
                <Link href={`/cards/${line.card.id}`}>{line.card.name}</Link>
                <span className="subtle">
                  {variantLabel(line.variant.descriptor)} · Qty{" "}
                  {line.lot.quantity}
                </span>
                {line.variant.marketCents === null ? (
                  <span className="pill pill-warning">Unpriced</span>
                ) : (
                  <span className="pill pill-warning">
                    Stale
                    {line.variant.observedAt &&
                      ` · ${shortDate(line.variant.observedAt)}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

function AllocationBars({
  label,
  slices,
}: {
  label: string;
  slices: ReturnType<typeof allocate>;
}) {
  return (
    <div className="allocation">
      <h3>{label}</h3>
      {slices.length === 0 ? (
        <p className="subtle">No priced holdings yet.</p>
      ) : (
        <ul>
          {slices.map((slice) => (
            <li key={slice.group}>
              <span>{slice.group}</span>
              <span className="money">{money(slice.marketValueCents)}</span>
              <span className="allocation-share">
                {percent(slice.shareBps)}
              </span>
              <span className="allocation-bar" aria-hidden="true">
                <span style={{ width: `${slice.shareBps / 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HoldingDetails({
  line,
  portfolioValueCents,
}: {
  line: PortfolioLine;
  portfolioValueCents: number;
}) {
  const returnBps =
    line.gainLossCents === null
      ? null
      : ratioBps(line.gainLossCents, line.lot.totalCostCents);
  const shareBps =
    line.marketValueCents === null
      ? null
      : ratioBps(line.marketValueCents, portfolioValueCents);
  const unitCostCents = Math.round(line.lot.totalCostCents / line.lot.quantity);
  const priced = line.marketValueCents !== null;

  return (
    <div className="holding-details advanced-only">
      <div>
        <small>Return</small>
        <div
          className={`money ${returnBps === null ? "" : returnBps >= 0 ? "positive" : "negative"}`}
        >
          {returnBps === null ? "—" : signedPercent(returnBps)}
        </div>
      </div>
      <div>
        <small>Unit cost</small>
        <div className="money">{money(unitCostCents)}</div>
      </div>
      <div>
        <small>Unit market</small>
        <div className={`money ${priced ? "" : "unpriced"}`}>
          {line.variant.marketCents === null
            ? "—"
            : money(line.variant.marketCents)}
        </div>
      </div>
      <div>
        <small>Share</small>
        <div className="money">
          {shareBps === null ? "—" : percent(shareBps)}
        </div>
      </div>
      <div>
        <small>Price date</small>
        <div className={`money ${line.variant.stale ? "unpriced" : ""}`}>
          {line.variant.observedAt === null ? (
            "None"
          ) : (
            <>
              {line.variant.stale && "Stale · "}
              <time dateTime={line.variant.observedAt}>
                {shortDate(line.variant.observedAt)}
              </time>
            </>
          )}
        </div>
      </div>
    </div>
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

function pricedInput(line: PortfolioLine) {
  return {
    costCents: line.lot.totalCostCents,
    marketValueCents: line.marketValueCents,
  };
}

async function getPortfolio(): Promise<Portfolio | null> {
  return getJson<Portfolio>("/v1/portfolio");
}

async function getTicker(): Promise<MarketTickerData | null> {
  return getJson<MarketTickerData>("/v1/market/ticker");
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: { "x-mock-user-id": "demo-user" },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
