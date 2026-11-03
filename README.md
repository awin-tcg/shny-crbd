# SHNY CRBD

SHNY CRBD is a security-first trading-card search and private portfolio valuation
app for web and mobile.

## Start locally

Requirements: Node 22+, Corepack, and optionally Docker.

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

The web app runs at `http://localhost:3000`, the API at `http://localhost:4000`, and API docs at `http://localhost:4000/docs`. Development uses explicit mock identity and market-data adapters. Send `x-mock-user-id: demo-user` when calling protected APIs directly.

## Quality checks

```bash
pnpm check
```

Read the [functional requirements](docs/product/functional-requirements.md), [architecture](docs/architecture/architecture.md), and [STRIDE threat model](docs/security/threat-model.md) before changing a trust boundary.

Production must not run with mock adapters. Identity-provider and Scrydex enablement remain documented decision gates.
