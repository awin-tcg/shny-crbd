# ADR 0001: TypeScript Monorepo and Versioned REST API

- Status: Accepted
- Date: 2026-07-15

## Decision

Use a pnpm/Turborepo monorepo containing Next.js web, Fastify API, and Expo mobile applications. Share transport schemas and framework-independent domain rules through packages. Both clients use the same `/v1` REST API described by OpenAPI.

## Rationale

The web-first release and later native client need stable contracts without duplicating valuation behavior. A dedicated API prevents Next.js server details from becoming an accidental mobile contract. TypeScript reduces schema drift, while runtime validation remains mandatory.

## Consequences

The API is independently deployable and requires CORS, auth, migrations, and monitoring. Shared packages may contain contracts and pure rules but must not import client or server frameworks.
