import type { MarketTicker as MarketTickerData } from "@cardboard/contracts";
import Link from "next/link";
import { money, percent, shortDate, variantLabel } from "../lib/format";

const minimumItemsPerLoop = 8;
const secondsPerItem = 5;

export function MarketTicker({ ticker }: { ticker: MarketTickerData }) {
  if (ticker.items.length === 0) return null;

  const copiesPerLoop = Math.ceil(minimumItemsPerLoop / ticker.items.length);
  const groups = copiesPerLoop * 2;
  const observedDates = [
    ...new Set(ticker.items.map((item) => item.observedAt.slice(0, 10))),
  ].sort();
  const observed =
    observedDates.length === 1
      ? shortDate(observedDates[0]!)
      : `${shortDate(observedDates[0]!)}–${shortDate(observedDates.at(-1)!)}`;

  return (
    <section className="ticker" aria-label="Market ticker">
      <p className="ticker-label">
        <span>1D · USD</span>
        <small>
          {ticker.source === "mock" ? "Indicative · " : ""}
          <time dateTime={observedDates.at(-1)}>{observed}</time>
        </small>
      </p>
      <div className="ticker-viewport">
        <div
          className="ticker-track"
          style={
            {
              "--ticker-duration": `${ticker.items.length * copiesPerLoop * secondsPerItem}s`,
            } as React.CSSProperties
          }
        >
          {Array.from({ length: groups }, (_, group) => (
            <ul
              aria-hidden={group > 0 || undefined}
              className="ticker-group"
              key={group}
            >
              {ticker.items.map((item) => {
                const direction =
                  item.changeCents > 0
                    ? "up"
                    : item.changeCents < 0
                      ? "down"
                      : "flat";
                return (
                  <li key={item.variantId}>
                    <Link
                      className="ticker-item"
                      href={`/cards/${item.cardId}`}
                      tabIndex={group > 0 ? -1 : undefined}
                      title={`Observed ${shortDate(item.observedAt)} · previous ${shortDate(item.previousObservedAt)}`}
                    >
                      {item.owned && (
                        <span className="ticker-owned">
                          <span className="visually-hidden">Owned: </span>
                        </span>
                      )}
                      <span className="ticker-name">{item.name}</span>
                      <span className="ticker-variant">
                        {variantLabel(item.descriptor)}
                      </span>
                      <span className={`ticker-change ${direction}`}>
                        <span aria-hidden="true">
                          {direction === "up"
                            ? "▲"
                            : direction === "down"
                              ? "▼"
                              : "■"}
                        </span>
                        <span className="visually-hidden">
                          {direction === "flat" ? "unchanged" : direction}{" "}
                        </span>
                        {item.changeBps === null
                          ? "—"
                          : percent(item.changeBps)}
                      </span>
                      <span className="ticker-price">
                        {money(item.marketCents)}
                      </span>
                      <span className="visually-hidden">
                        , observed {shortDate(item.observedAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
