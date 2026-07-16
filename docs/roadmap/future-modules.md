# Future Module Boundaries

## Vendor workspace

Vendor operations are a separate bounded context and top-level tab, not a mode of the personal portfolio. It will own event inventory, opening stock, acquisitions, sales, payment method, platform/card fees, expenses, cash reconciliation, and realized profit/loss. Transfers between personal and vendor inventory require an explicit, auditable transaction.

Before implementation, define accounting conventions, tax/export requirements, multi-user booth access, offline conflict handling, and a dedicated STRIDE data flow.

## Friends and sharing

Portfolio access remains owner-only until a relationship and grants model exists. Future access should use explicit accepted friendships and resource-level grants, support revocation, avoid exposing cost basis by default, and prevent enumeration. Public links are a separate feature and threat boundary.

## AI insights

AI output must be informational, not a guaranteed or personalized investment recommendation. Inputs use normalized market observations and licensed news, not private notes by default. Outputs show source citations, observation window, confidence, missing data, and model/version provenance.

The design must defend against prompt injection in external content, data poisoning, unsupported claims, privacy leakage, runaway cost, and automated trading behavior. Deterministic calculations remain outside the model.

## News, video, sentiment, and releases

Each source needs an approved API or feed, attribution, retention and display rights, freshness, deduplication, and takedown process. YouTube embeds and Reddit content must follow platform terms. Sentiment must identify sample size, time window, language, and manipulation limitations. Release dates need source provenance and timezone.
