# Data Glossary

| Term               | Meaning                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| User               | Internal collector account, independent of any login provider.                                 |
| External identity  | Provider issuer and subject linked to one user. Email is profile data, not identity authority. |
| Game               | A trading-card game such as Pokémon or One Piece.                                              |
| Set                | A release or expansion within a game.                                                          |
| Canonical card     | Printing-specific catalog record identified by provider ID, set, number, language, and game.   |
| Market variant     | A priceable form of a card: raw condition or exact grading company and grade.                  |
| Price snapshot     | Append-only observed market value for one variant, source, currency, and instant.              |
| Acquisition lot    | One purchase event for a quantity of the same card variant and shared cost basis.              |
| Portfolio snapshot | Daily aggregate market value and cost basis for one user.                                      |
| Cost basis         | Amount paid, represented in USD cents for the MVP.                                             |
| Current price      | Latest eligible, non-expired snapshot for an exact market variant.                             |
| Stale price        | Observation older than the configured freshness window; visible but not silently valued.       |
| Idempotency record | Owner-scoped record binding a mutation key to its request hash and result.                     |
| Audit event        | Privacy-minimized record of a security-relevant actor, action, resource, result, and request.  |

## Variant rules

- Raw variants require a normalized condition (`near_mint`, `lightly_played`, `moderately_played`, `heavily_played`, or `damaged`).
- Graded variants require a grader and grade. Qualifiers such as pristine or black label are explicit grades, not notes.
- A variant is either raw or graded, never both.
- Provider identifiers are namespaced; they are not used as internal primary keys.
- Currency is stored with every monetary observation even while only USD is accepted.
