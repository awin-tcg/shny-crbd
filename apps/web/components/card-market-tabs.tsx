"use client";

import type { Card } from "@cardboard/contracts";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import {
  conditionLabel,
  money,
  observedLabel,
  shortDate,
  variantLabel,
} from "../lib/format";

type Variant = Card["variants"][number];

interface Holding {
  lotId: string;
  variant: Variant;
  quantity: number;
  totalCostCents: number;
  marketValueCents: number | null;
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "raw", label: "Raw" },
  { id: "graded", label: "Graded" },
  { id: "solds", label: "Solds" },
  { id: "listings", label: "Listings" },
] as const;
type TabId = (typeof tabs)[number]["id"];

export function CardMarketTabs({
  card,
  holdings,
}: {
  card: Card;
  holdings: Holding[];
}) {
  const [active, setActive] = useState<TabId>("overview");
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      Home: -index,
      End: tabs.length - 1 - index,
    };
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next = (index + move + tabs.length) % tabs.length;
    const target = tabs[next];
    if (!target) return;
    setActive(target.id);
    tabRefs.current[next]?.focus();
  }

  const raw = card.variants.filter((v) => v.descriptor.kind === "raw");
  const graded = card.variants.filter((v) => v.descriptor.kind === "graded");

  return (
    <section className="market-tabs" aria-label="Market data">
      <div role="tablist" aria-label="Market data views" className="tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            role="tab"
            type="button"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            className="tab"
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
            {tab.id === "raw" && (
              <span className="tab-count">{raw.length}</span>
            )}
            {tab.id === "graded" && (
              <span className="tab-count">{graded.length}</span>
            )}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="tabpanel panel"
      >
        {active === "overview" && (
          <Overview card={card} raw={raw} graded={graded} holdings={holdings} />
        )}
        {active === "raw" && <VariantTable variants={raw} kind="raw" />}
        {active === "graded" && (
          <VariantTable variants={graded} kind="graded" />
        )}
        {active === "solds" && (
          <Unavailable
            title="Recent sales"
            body="Completed-sale history is not connected yet. It will appear here once a licensed sold-comps source is enabled, with the sale date, platform, and grade shown for every row."
          />
        )}
        {active === "listings" && (
          <Unavailable
            title="Live listings"
            body="Current marketplace asking prices are not connected yet. When enabled, listings will show seller platform, condition or grade, and the time the listing was observed."
          />
        )}
      </div>
    </section>
  );
}

function Overview({
  card,
  raw,
  graded,
  holdings,
}: {
  card: Card;
  raw: Variant[];
  graded: Variant[];
  holdings: Holding[];
}) {
  const bestRaw = pickBest(raw);
  const bestGraded = pickBest(graded);
  const priced = card.variants.filter(
    (v) => v.marketCents !== null && !v.stale,
  ).length;
  const ownedQuantity = holdings.reduce((sum, h) => sum + h.quantity, 0);
  const ownedValue = holdings.reduce<number | null>((sum, h) => {
    if (h.marketValueCents === null) return sum;
    return (sum ?? 0) + h.marketValueCents;
  }, null);
  const ownedCost = holdings.reduce((sum, h) => sum + h.totalCostCents, 0);

  return (
    <div className="overview-grid">
      <PriceCard
        label="Raw market"
        variant={bestRaw}
        fallback="No raw pricing"
      />
      <PriceCard
        label="Top graded"
        variant={bestGraded}
        fallback="No graded pricing"
      />
      <div className="metric">
        <span className="metric-label">Priced variants</span>
        <span className="metric-value">
          {priced}
          <span className="metric-sub"> of {card.variants.length}</span>
        </span>
      </div>

      <div className="owned-panel">
        <p className="eyebrow">You own</p>
        {holdings.length === 0 ? (
          <p className="subtle">
            Not in your portfolio yet. Add a lot below to start tracking it.
          </p>
        ) : (
          <>
            <ul className="summary-list">
              <li>
                <span>Quantity</span>
                <strong>{ownedQuantity}</strong>
              </li>
              <li>
                <span>Market value</span>
                <strong className={ownedValue === null ? "unpriced" : ""}>
                  {ownedValue === null ? "Unpriced" : money(ownedValue)}
                </strong>
              </li>
              <li>
                <span>Cost basis</span>
                <strong>{money(ownedCost)}</strong>
              </li>
            </ul>
            <ul className="owned-lots">
              {holdings.map((h) => (
                <li key={h.lotId}>
                  <span>{variantLabel(h.variant.descriptor)}</span>
                  <span>
                    Qty {h.quantity} ·{" "}
                    {h.marketValueCents === null
                      ? "Unpriced"
                      : money(h.marketValueCents)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function PriceCard({
  label,
  variant,
  fallback,
}: {
  label: string;
  variant: Variant | null;
  fallback: string;
}) {
  if (!variant || variant.marketCents === null) {
    return (
      <div className="metric">
        <span className="metric-label">{label}</span>
        <span className="metric-value unpriced">{fallback}</span>
      </div>
    );
  }
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${variant.stale ? "unpriced" : ""}`}>
        {money(variant.marketCents)}
      </span>
      <span className="metric-sub">
        {variantLabel(variant.descriptor)} ·{" "}
        {observedLabel(variant.observedAt, variant.stale)}
      </span>
    </div>
  );
}

function VariantTable({
  variants,
  kind,
}: {
  variants: Variant[];
  kind: "raw" | "graded";
}) {
  if (variants.length === 0) {
    return (
      <div className="empty-state">
        No {kind} variants are tracked for this card yet.
      </div>
    );
  }
  return (
    <table className="variant-table">
      <caption className="visually-hidden">
        {kind === "raw" ? "Raw condition pricing" : "Graded pricing"} in USD
      </caption>
      <thead>
        <tr>
          <th scope="col">{kind === "raw" ? "Condition" : "Grade"}</th>
          <th scope="col" className="numeric">
            Market
          </th>
          <th scope="col">Observed</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {variants.map((variant) => (
          <tr key={variant.id}>
            <th scope="row">
              {variant.descriptor.kind === "raw"
                ? conditionLabel(variant.descriptor.condition)
                : `${variant.descriptor.grader} ${variant.descriptor.grade}`}
            </th>
            <td
              className={`numeric ${variant.marketCents === null ? "unpriced" : ""}`}
            >
              {variant.marketCents === null ? "—" : money(variant.marketCents)}
            </td>
            <td>
              {variant.observedAt ? (
                <time dateTime={variant.observedAt}>
                  {shortDate(variant.observedAt)}
                </time>
              ) : (
                "—"
              )}
            </td>
            <td>
              <StatusPill variant={variant} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusPill({ variant }: { variant: Variant }) {
  if (variant.marketCents === null)
    return <span className="pill pill-muted">Unpriced</span>;
  if (variant.stale) return <span className="pill pill-warning">Stale</span>;
  return <span className="pill pill-positive">Current</span>;
}

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state unavailable" role="note">
      <strong>{title} · not connected</strong>
      <p>{body}</p>
    </div>
  );
}

function pickBest(variants: Variant[]): Variant | null {
  const priced = variants.filter((v) => v.marketCents !== null && !v.stale);
  const pool = priced.length > 0 ? priced : variants;
  return (
    pool.reduce<Variant | null>(
      (best, v) =>
        best === null || (v.marketCents ?? -1) > (best.marketCents ?? -1)
          ? v
          : best,
      null,
    ) ?? null
  );
}
