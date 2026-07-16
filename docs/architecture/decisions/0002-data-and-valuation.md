# ADR 0002: PostgreSQL, Cache, and Exact Variant Valuation

- Status: Accepted
- Date: 2026-07-15

## Decision

Use PostgreSQL as the source of truth and a Redis-compatible service only as a disposable cache. Persist catalog metadata, acquisition lots, append-only price observations, and daily portfolio snapshots. Value a lot only with the latest eligible price for its exact raw condition or grader/grade variant.

Money is stored as integer cents. Historical charts use persisted UTC daily snapshots.

## Rationale

Relational constraints suit ownership, lots, and traceable pricing. Exact integer arithmetic prevents floating-point errors. Exact variant matching avoids materially misleading graded-card valuations. Stored snapshots preserve what the user saw at the time.

## Consequences

Missing and stale prices must be first-class UI states. A backdated edit does not automatically rewrite historical snapshots. Cache loss affects latency and provider credits, not correctness.
