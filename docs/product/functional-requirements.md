# Functional Requirements

## Document control

- **Status:** Active MVP requirements.
- **Maintenance trigger:** Update when product scope, acceptance journeys, or
  functional and quality requirements change.

### Revision history

- Unreleased (2026-11-02): Added home data view and market ticker requirements
  (FR-046 through FR-048).
- `5e766ac` (2026-11-02): Added account page requirements (FR-043 through
  FR-045).
- `d764a86` (2026-11-02): Added card detail page requirements (FR-015 through
  FR-019) and its acceptance journey.
- `a42d662` (2026-11-02): Renamed the user-facing product to SHNY CRBD.
- `e59dee4` (2026-07-15): Renamed the user-facing product to CRDBRD.
- `4ad1e16` (2026-07-15): Added temporary trade-calculator requirements and its
  acceptance journey.
- `6240bb7` (2026-07-15): Established the MVP functional and quality
  requirements.

## Product goal

SHNY CRBD helps US collectors find trading cards and track the market value and cost
basis of a private collection. The MVP supports Pokémon, One Piece, Gundam, and
Yu-Gi-Oh! through a provider-neutral catalog.

## Actors

- **Collector:** authenticated owner of one portfolio.
- **Market data provider:** supplies catalog metadata and variant prices.
- **Operator:** maintains data synchronization and responds to security events; has no product UI in the MVP.

## MVP requirements

### Identity

- FR-001: A collector can sign in with Google or Apple through an approved OIDC provider.
- FR-002: A collector can sign out of all active sessions.
- FR-003: The service links identities only after proving control of both identities; matching email alone is insufficient.
- FR-004: Development may use the explicit mock identity adapter. Production must fail closed when no production provider is configured.

### Catalog search

- FR-010: A collector can search by card name, game, set, card number, rarity, and language.
- FR-011: Search results show the card image, game, set, number, and available raw or graded variants.
- FR-012: Empty, unavailable, stale, and rate-limited states are distinguishable.
- FR-013: Upstream credentials and raw provider responses are never sent to a client.

### Card detail

- FR-015: Every search result and portfolio holding links to a card detail page addressed by the card's stable identifier. Unknown or malformed identifiers return a not-found page.
- FR-016: The card detail page shows the card image and facts (game, set, number, rarity, language) and groups market data into Overview, Raw, Graded, Solds, and Listings views that are keyboard operable and announced as tabs.
- FR-017: Raw and graded views list each exact variant with its market value, observation date, and a Current, Stale, or Unpriced status. Stale and unpriced variants are never summed into a headline figure.
- FR-018: Views whose data source is not connected (recent sales, live listings) say so explicitly instead of showing placeholder numbers.
- FR-019: A collector can add a lot directly from the card detail page, and the page shows the collector's own quantity, market value, cost basis, and lots for that card when any exist.

### Portfolio

- FR-020: A collector can add, edit, and remove an acquisition lot.
- FR-021: A lot records card, quantity, purchase date, total cost in USD, condition or grader/grade, and optional notes.
- FR-022: Quantity is a positive integer. Money is represented exactly in cents.
- FR-023: Every lot operation is authorized against the authenticated owner.
- FR-024: Repeated create requests with the same idempotency key produce one lot.
- FR-025: Deletion is soft deletion so historical snapshots and audit records remain explainable.

### Valuation and charts

- FR-030: Current portfolio value uses the latest non-expired price matching each lot's exact market variant.
- FR-031: Missing or stale values are shown explicitly and excluded from totals; the app never silently substitutes near-mint raw pricing for a graded card.
- FR-032: The dashboard shows current market value, cost basis, unrealized gain/loss, valued item count, and unpriced item count.
- FR-033: A daily snapshot records the portfolio aggregate in UTC. At most one current snapshot exists per user and UTC day.
- FR-034: The chart displays persisted daily snapshots. Backdated lot edits do not rewrite history automatically.
- FR-046: The portfolio home offers a Simple and Advanced data view toggle. Simple is the default and shows totals, the value chart, and holdings. The choice persists on the device and is applied before first paint.
- FR-047: The Advanced view adds return on priced cost, value change since the first and previous snapshots, best and worst performers, allocation by game and by raw versus graded, price freshness (missing and stale counts, observation dates, and the holdings excluded from totals), and per-holding return, unit cost, unit market, share of portfolio, and price date. Every figure is computed in integer cents from priced, non-stale values only.
- FR-048: The portfolio home shows a scrolling market ticker of exact-variant prices with their one-day change. Items link to card detail, mark variants the collector owns, and show observation dates; quotes are labelled indicative while the mock market adapter is active. The ticker pauses on hover, stops while a ticker link has keyboard focus, and is a static scrollable row when reduced motion is requested.

### Trade calculator

- FR-035: A collector can add one or more exact raw-condition or graded variants, quantities, and cash to each side of a temporary trade comparison.
- FR-036: A collector can adjust the percentage applied to incoming card market value from 0% through 100%. Cash on both sides remains at face value.
- FR-037: The comparison shows each side's raw card market value, cash, adjusted incoming card value, effective total, dollar and percentage difference, and a plain-language advantage or balanced result.
- FR-038: Missing and stale prices are labeled, counted, and excluded from priced trade totals. The comparison remains visibly incomplete while any included quantity is unpriced.
- FR-039: A trade calculation does not persist a draft, create a trade record, or mutate the collector's portfolio.

### Privacy and lifecycle

- FR-040: Portfolios are private in the MVP. APIs expose no endpoint for viewing another collector's data.
- FR-041: A collector can request an export and account deletion; operational completion may be asynchronous.
- FR-043: An account page, reached from the header avatar, shows the signed-in collector, identity provider, and lot count, and offers sign-out, export request, deletion request, and a reset of device-only preferences.
- FR-044: Deletion requires an explicit confirmation step, shows its pending state, and can be cancelled until processed. Repeating an export or deletion request does not create a second request.
- FR-045: Sign-out is disabled with an explanation while the development identity adapter is active, because it has no session to end.
- FR-042: Audit events avoid card notes, OAuth tokens, provider secrets, and full upstream payloads.

## Quality requirements

- NFR-001: Web pages meet WCAG 2.2 AA for keyboard navigation, contrast, labels, and reduced motion.
- NFR-002: Read APIs target p95 under 500 ms from cache; provider outages degrade to labeled cached data.
- NFR-003: All API inputs are schema validated and bounded. Collection list endpoints are paginated.
- NFR-004: Security-sensitive actions emit correlated audit events.
- NFR-005: Price timestamps and currency are visible wherever a value is displayed.
- NFR-006: Application times are stored as UTC instants; purchase dates are calendar dates.

## Explicitly outside the MVP

- Friend requests or shared portfolios
- Vendor inventory, sales, fees, expenses, and profit/loss
- Billing
- AI buy/sell recommendations or market sentiment
- News, YouTube, Reddit, and release calendars
- Card image recognition and user-uploaded card photos

## Acceptance journeys

1. A signed-in collector searches across supported games, opens a card, selects a raw or graded variant, and creates a lot.
2. The dashboard immediately reflects cost basis and the matching mock market price.
3. A collector edits quantity and cost, then sees a new valuation without gaining access to another collector's lot.
4. A daily snapshot produces chart history and clearly reports stale or missing prices.
5. Invalid, duplicate, unauthorized, and rate-limited requests return stable problem responses without leaking internal details.
6. A collector adds exact variants and cash to both sides of a trade, applies an incoming-card percentage, adjusts quantities, and sees transparent totals without changing the portfolio.
7. A collector opens a card from search or a holding, moves between the Overview, Raw, and Graded views by keyboard, sees that sales and listings are not yet connected, and adds a graded lot that then appears under "You own".
