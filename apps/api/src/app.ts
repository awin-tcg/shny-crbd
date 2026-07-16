import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import {
  createLotSchema,
  searchQuerySchema,
  updateLotSchema,
} from "@cardboard/contracts";
import { demoUserId } from "@cardboard/test-data";
import {
  createIdentityVerifier,
  type IdentityVerifier,
  type Principal,
} from "./auth.js";
import { createMarketDataProvider, type MarketDataProvider } from "./market.js";
import { PortfolioService } from "./portfolio.js";
import { IdempotencyConflictError, InMemoryStore } from "./store.js";

declare module "fastify" {
  interface FastifyRequest {
    principal?: Principal;
  }
}

export interface AppOptions {
  environment?: string;
  identity?: IdentityVerifier;
  market?: MarketDataProvider;
  store?: InMemoryStore;
  seedDemo?: boolean;
}

export async function buildApp(
  options: AppOptions = {},
): Promise<FastifyInstance> {
  const environment =
    options.environment ?? process.env.NODE_ENV ?? "development";
  const identity = options.identity ?? createIdentityVerifier(environment);
  const market = options.market ?? createMarketDataProvider(environment);
  const store = options.store ?? new InMemoryStore();
  const portfolio = new PortfolioService(store, market);
  const app = Fastify({
    logger: environment !== "test",
    bodyLimit: 64 * 1024,
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(helmet, {
    contentSecurityPolicy: environment === "production",
  });
  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });
  await app.register(rateLimit, {
    max: environment === "test" ? 10_000 : 120,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.principal?.userId ?? request.ip,
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "CRDBRD API",
        version: "0.1.0",
        description: "Private trading-card portfolio API",
      },
      servers: [{ url: "http://localhost:4000" }],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return problem(
        reply,
        request,
        400,
        "Invalid request",
        error.issues[0]?.message,
      );
    }
    if (error instanceof IdempotencyConflictError) {
      return problem(
        reply,
        request,
        409,
        "Idempotency conflict",
        error.message,
      );
    }
    if (error instanceof UnauthorizedError) {
      return problem(reply, request, 401, "Authentication required");
    }
    request.log.error({ err: error }, "request failed");
    return problem(reply, request, 500, "Internal server error");
  });

  app.addHook("onRequest", async (request) => {
    if (!request.url.startsWith("/v1/")) return;
    const principal = await identity.verify(request);
    if (!principal) throw new UnauthorizedError();
    request.principal = principal;
  });

  app.get("/health", { schema: { tags: ["operations"] } }, async () => ({
    status: "ok",
  }));

  app.get("/v1/me", { schema: { tags: ["identity"] } }, async (request) => ({
    userId: requirePrincipal(request).userId,
  }));

  app.get("/v1/cards", { schema: { tags: ["catalog"] } }, async (request) => {
    const query = searchQuerySchema.parse(request.query);
    return {
      items: await market.search({
        query: query.q,
        game: query.game,
        limit: query.limit,
      }),
    };
  });

  app.get<{ Params: { id: string } }>(
    "/v1/cards/:id",
    { schema: { tags: ["catalog"] } },
    async (request, reply) => {
      const card = await market.getCard(request.params.id);
      if (!card) return problem(reply, request, 404, "Card not found");
      return card;
    },
  );

  app.get(
    "/v1/portfolio",
    { schema: { tags: ["portfolio"] } },
    async (request) => portfolio.getPortfolio(requirePrincipal(request).userId),
  );

  app.post(
    "/v1/portfolio/snapshots",
    { schema: { tags: ["portfolio"] } },
    async (request, reply) => {
      const snapshot = await portfolio.snapshot(
        requirePrincipal(request).userId,
        request.id,
      );
      return reply.code(201).send(snapshot);
    },
  );

  app.post(
    "/v1/lots",
    { schema: { tags: ["portfolio"] } },
    async (request, reply) => {
      const idempotencyKey = request.headers["idempotency-key"];
      if (
        typeof idempotencyKey !== "string" ||
        !/^[\x21-\x7E]{8,128}$/.test(idempotencyKey)
      ) {
        return problem(
          reply,
          request,
          400,
          "Invalid Idempotency-Key",
          "Provide 8 to 128 visible ASCII characters",
        );
      }
      const input = createLotSchema.parse(request.body);
      const card = await market.getCard(input.cardId);
      if (!card) return problem(reply, request, 400, "Unknown card");
      if (!card.variants.some((variant) => variant.id === input.variantId)) {
        return problem(reply, request, 400, "Variant does not belong to card");
      }
      const result = store.createLot(
        requirePrincipal(request).userId,
        input,
        idempotencyKey,
        request.id,
      );
      return reply
        .header("Idempotent-Replay", result.replayed ? "true" : "false")
        .code(result.replayed ? 200 : 201)
        .send(result.lot);
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/v1/lots/:id",
    { schema: { tags: ["portfolio"] } },
    async (request, reply) => {
      const input = updateLotSchema.parse(request.body);
      const lot = store.updateLot(
        requirePrincipal(request).userId,
        request.params.id,
        input,
        request.id,
      );
      if (!lot) return problem(reply, request, 404, "Lot not found");
      return lot;
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/lots/:id",
    { schema: { tags: ["portfolio"] } },
    async (request, reply) => {
      const deleted = store.deleteLot(
        requirePrincipal(request).userId,
        request.params.id,
        request.id,
      );
      if (!deleted) return problem(reply, request, 404, "Lot not found");
      return reply.code(204).send();
    },
  );

  if (options.seedDemo) await seedDemo(store, portfolio);

  return app;
}

class UnauthorizedError extends Error {}

function requirePrincipal(request: FastifyRequest): Principal {
  if (!request.principal) throw new UnauthorizedError();
  return request.principal;
}

function problem(
  reply: FastifyReply,
  request: FastifyRequest,
  status: number,
  title: string,
  detail?: string,
) {
  return reply
    .code(status)
    .type("application/problem+json")
    .send({
      type: `https://cardboard.local/problems/${title.toLowerCase().replaceAll(" ", "-")}`,
      title,
      status,
      ...(detail ? { detail } : {}),
      requestId: request.id,
    });
}

async function seedDemo(
  store: InMemoryStore,
  portfolio: PortfolioService,
): Promise<void> {
  const now = "2026-07-15T12:00:00.000Z";
  store.seedLot({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    userId: demoUserId,
    cardId: "11111111-1111-4111-8111-111111111111",
    variantId: "11111111-1111-4111-8111-111111111112",
    quantity: 1,
    purchaseDate: "2026-07-01",
    totalCostCents: 35_000,
    notes: "Show pickup",
    createdAt: now,
    updatedAt: now,
  });
  for (const [date, marketValueCents] of [
    ["2026-07-11", 38_000],
    ["2026-07-12", 39_500],
    ["2026-07-13", 41_000],
    ["2026-07-14", 40_500],
  ] as const) {
    store.saveSnapshot(
      demoUserId,
      {
        date,
        marketValueCents,
        costBasisCents: 35_000,
        valuedItems: 1,
        unpricedItems: 0,
      },
      `seed-${date}`,
    );
  }
  await portfolio.snapshot(demoUserId, "seed-current", "2026-07-15");
}
