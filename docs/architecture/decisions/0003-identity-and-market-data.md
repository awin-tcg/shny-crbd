# ADR 0003: Provider Boundaries for Identity and Market Data

- Status: Accepted with implementation decision pending
- Date: 2026-07-15

## Decision

Define narrow `IdentityVerifier` and `MarketDataProvider` ports. Use explicit mock adapters in development and tests. Select Clerk, Auth0, or Better Auth through a follow-up ADR before production OAuth is enabled. Select Scrydex only after verifying its schema and obtaining terms suitable for the product.

Production identity must support Google and Apple through OIDC authorization code flow with PKCE. Market data is normalized and cached server-side; credentials never enter client bundles.

## Rationale

Identity selection was intentionally deferred. Scrydex is metered and its published terms prohibit unapproved resale, sublicensing, or redistribution. Boundaries let product work proceed without pretending those decisions are complete.

## Consequences

Production startup fails if a mock identity or market adapter is selected. Provider contract tests are required. Before enabling Scrydex, record written authorization where needed, retention rules, image rights, quotas, and incident contacts.
