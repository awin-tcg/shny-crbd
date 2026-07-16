# Privacy and Retention

## Principles

Collect only data needed for identity, portfolio operation, security, and support. Cost basis and notes are private financial-adjacent data. They are never used for advertising or model training without a separate, explicit policy and consent.

## Baseline schedule

- Active account and portfolio: retained while the account is active.
- Deleted lots: retained for 30 days for recovery, then content is purged; minimal audit metadata may remain.
- Security audit events: 90 days online, then deleted unless an incident hold applies.
- Application logs: 30 days and free of notes, tokens, and full provider payloads.
- Idempotency records: 24 hours unless an operation needs a longer documented replay window.
- Price/catalog data: provider terms and provenance govern retention.
- Encrypted backups: rolling 30 days; deletions age out rather than rewriting immutable backups.

## Data subject operations

Exports are generated asynchronously, encrypted in transit and at rest, expire after 24 hours, and require reauthentication. Deletion revokes sessions first, marks the account pending deletion, and removes personal content from active stores. Completion and exceptions are auditable.

The schedule is a product baseline, not legal advice. It must be reviewed for launch jurisdictions and provider agreements.
