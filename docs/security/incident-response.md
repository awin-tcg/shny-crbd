# Incident Response Runbook

## Severity

- SEV-1: active account compromise, secret exposure, cross-tenant disclosure, or destructive integrity event.
- SEV-2: credible attempted compromise, significant outage, provider quota exhaustion, or delayed privacy operation.
- SEV-3: contained defect with limited security or availability effect.

## Response

1. **Detect and assign:** open an incident record, name an incident lead, preserve request IDs and timestamps.
2. **Contain:** revoke affected sessions or credentials, disable adapters/routes through controlled configuration, and rate-limit abuse. Preserve evidence before destructive cleanup.
3. **Assess:** identify affected users, data, time window, provider dependencies, and legal/contract notification duties.
4. **Eradicate and recover:** patch the cause, rotate credentials, restore trusted data, verify tenant isolation, and monitor for recurrence.
5. **Communicate:** provide accurate scoped updates; do not speculate or include sensitive evidence.
6. **Learn:** complete a blameless review, update STRIDE threats and tests, and assign dated corrective actions.

## Minimum evidence

Deployment version, configuration version, correlated audit/application events, identity-provider events, database audit/backup state, affected resource IDs, and containment actions. Never copy OAuth tokens or secrets into tickets or chat.
