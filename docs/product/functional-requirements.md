# Functional Requirements

## Product goal

Cardboard helps US collectors find trading cards and track the market value and cost basis of a private collection. The MVP supports Pokémon, One Piece, Gundam, and Yu-Gi-Oh! through a provider-neutral catalog.

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

### Privacy and lifecycle

- FR-040: Portfolios are private in the MVP. APIs expose no endpoint for viewing another collector's data.
- FR-041: A collector can request an export and account deletion; operational completion may be asynchronous.
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
