# Near-term backlog

Checklist for SHNY CRBD iron-outs and deferred modules. Module design
boundaries live in [future-modules.md](future-modules.md).

### Revision history

- (2026-11-02): Initial near-term backlog, open decisions, and known
  limitations.

## Recently shipped

- [x] Onboarding banner
- [x] Card detail page
- [x] Home simplify
- [x] Account page
- [x] Simple / Advanced home view + market ticker
- [x] Private GitHub remote (`https://github.com/awin-tcg/shny-crbd`)

## Near-term iron-outs

Priority order:

- [ ] **Postgres persist** — Replace in-memory API store with PostgreSQL +
  migrations + tenant isolation tests
- [ ] **OAuth (production)** — Choose identity provider (Clerk / Auth0 /
  Better Auth); enable Google / Apple OAuth; enable Sign out
- [ ] **Scrydex live** — Confirm Scrydex terms / plan; swap mock adapter for
  live catalog + daily price refresh
- [ ] **Market stack** — Integrate solds + eBay / listing comps behind
  cache / quota controls (replace card-detail “not connected”)
- [ ] **Watchlist + alerts** — Watchlist and price / movement alerts
  (paid-tier candidate)

## Later modules

- [ ] **News** — YouTube / Reddit / release calendar tab
- [ ] **Vendor** — Vendor P&L tab (see [future-modules.md](future-modules.md))
- [ ] **Friend sharing** — Portfolio sharing with grants / revocation
- [ ] **AI insights** — Buy / sell / sentiment (informational only)
- [ ] **Billing** — Monetization tiers

## Open decisions

- [ ] Scrydex plan + redistribution / caching terms
- [ ] Identity provider (Clerk / Auth0 / Better Auth)
- [ ] Monetization: free vs paid depth for alerts / solds / AI / vendor

## Known limitations (while developing)

- Market ticker is mock / indicative, not live quotes
- API data resets on process restart (in-memory store)
- Sign out is disabled until production OAuth
- Preview / share URLs may not reflect local-only state
