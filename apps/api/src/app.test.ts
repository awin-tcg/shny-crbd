import { afterEach, describe, expect, it } from "vitest";
import { marketTickerSchema } from "@cardboard/contracts";
import { buildApp } from "./app.js";
import { createIdentityVerifier } from "./auth.js";
import { InMemoryStore } from "./store.js";

const auth = { "x-mock-user-id": "alice" };
const otherAuth = { "x-mock-user-id": "bob" };
const cardId = "11111111-1111-4111-8111-111111111111";
const variantId = "11111111-1111-4111-8111-111111111112";

describe("Cardboard API", () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function app(store = new InMemoryStore()) {
    const instance = await buildApp({ environment: "test", store });
    apps.push(instance);
    return instance;
  }

  it("requires authentication and returns privacy-safe problems", async () => {
    const instance = await app();
    const response = await instance.inject({
      method: "GET",
      url: "/v1/portfolio",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      title: "Authentication required",
      status: 401,
    });
    expect(response.json()).not.toHaveProperty("stack");
  });

  it("searches the normalized multi-game catalog", async () => {
    const instance = await app();
    const response = await instance.inject({
      method: "GET",
      url: "/v1/cards?q=charizard&game=pokemon",
      headers: auth,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toHaveLength(1);
    expect(response.json().items[0].name).toBe("Charizard");
  });

  it("creates one lot for idempotent retries", async () => {
    const instance = await app();
    const payload = {
      cardId,
      variantId,
      quantity: 2,
      purchaseDate: "2026-07-15",
      totalCostCents: 60_000,
    };
    const request = {
      method: "POST" as const,
      url: "/v1/lots",
      headers: { ...auth, "idempotency-key": "create-lot-0001" },
      payload,
    };

    const created = await instance.inject(request);
    const replayed = await instance.inject(request);
    const portfolio = await instance.inject({
      method: "GET",
      url: "/v1/portfolio",
      headers: auth,
    });

    expect(created.statusCode).toBe(201);
    expect(replayed.statusCode).toBe(200);
    expect(replayed.headers["idempotent-replay"]).toBe("true");
    expect(replayed.json().id).toBe(created.json().id);
    expect(portfolio.json().lines).toHaveLength(1);
    expect(portfolio.json()).toMatchObject({
      marketValueCents: 85_000,
      costBasisCents: 60_000,
      gainLossCents: 25_000,
    });
  });

  it("serves an indicative daily ticker of priced variants", async () => {
    const instance = await app();
    await instance.inject({
      method: "POST",
      url: "/v1/lots",
      headers: { ...auth, "idempotency-key": "ticker-lot-0001" },
      payload: {
        cardId,
        variantId,
        quantity: 1,
        purchaseDate: "2026-07-15",
        totalCostCents: 30_000,
      },
    });

    const response = await instance.inject({
      method: "GET",
      url: "/v1/market/ticker",
      headers: auth,
    });
    const other = await instance.inject({
      method: "GET",
      url: "/v1/market/ticker",
      headers: otherAuth,
    });
    const unauthenticated = await instance.inject({
      method: "GET",
      url: "/v1/market/ticker",
    });

    expect(response.statusCode).toBe(200);
    const ticker = marketTickerSchema.parse(response.json());
    expect(ticker.source).toBe("mock");
    expect(ticker.items.map((item) => item.changeBps)).toEqual([
      481, 266, -150, -143,
    ]);
    expect(ticker.items.some((item) => item.name === "RX-78-2 Gundam")).toBe(
      false,
    );
    expect(
      ticker.items.find((item) => item.variantId === variantId),
    ).toMatchObject({
      marketCents: 42_500,
      previousCents: 41_400,
      changeCents: 1_100,
      observedAt: "2026-07-15T12:00:00.000Z",
      previousObservedAt: "2026-07-14T12:00:00.000Z",
      owned: true,
    });
    expect(
      ticker.items.filter((item) => item.owned).map((item) => item.variantId),
    ).toEqual([variantId]);
    expect(
      other.json().items.some((item: { owned: boolean }) => item.owned),
    ).toBe(false);
    expect(unauthenticated.statusCode).toBe(401);
  });

  it("rejects reuse of an idempotency key with a changed body", async () => {
    const instance = await app();
    const base = {
      cardId,
      variantId,
      purchaseDate: "2026-07-15",
      totalCostCents: 30_000,
    };
    const headers = { ...auth, "idempotency-key": "create-lot-0002" };
    await instance.inject({
      method: "POST",
      url: "/v1/lots",
      headers,
      payload: { ...base, quantity: 1 },
    });
    const response = await instance.inject({
      method: "POST",
      url: "/v1/lots",
      headers,
      payload: { ...base, quantity: 2 },
    });

    expect(response.statusCode).toBe(409);
  });

  it("prevents cross-tenant reads and mutations", async () => {
    const store = new InMemoryStore();
    const instance = await app(store);
    const created = await instance.inject({
      method: "POST",
      url: "/v1/lots",
      headers: { ...auth, "idempotency-key": "tenant-test-01" },
      payload: {
        cardId,
        variantId,
        quantity: 1,
        purchaseDate: "2026-07-15",
        totalCostCents: 30_000,
      },
    });
    const lotId = created.json().id as string;

    const mutation = await instance.inject({
      method: "PATCH",
      url: `/v1/lots/${lotId}`,
      headers: otherAuth,
      payload: { quantity: 999 },
    });
    const otherPortfolio = await instance.inject({
      method: "GET",
      url: "/v1/portfolio",
      headers: otherAuth,
    });
    const ownerPortfolio = await instance.inject({
      method: "GET",
      url: "/v1/portfolio",
      headers: auth,
    });

    expect(mutation.statusCode).toBe(404);
    expect(otherPortfolio.json().lines).toHaveLength(0);
    expect(ownerPortfolio.json().lines[0].lot.quantity).toBe(1);
    expect(store.auditEvents).toContainEqual(
      expect.objectContaining({
        actorId: "bob",
        action: "lot.update",
        result: "denied",
      }),
    );
  });

  it("records lifecycle requests per account once and audits them", async () => {
    const store = new InMemoryStore();
    const instance = await app(store);

    const account = await instance.inject({
      method: "GET",
      url: "/v1/account",
      headers: auth,
    });
    expect(account.statusCode).toBe(200);
    expect(account.json()).toMatchObject({
      userId: "alice",
      sessionManaged: false,
      lotCount: 0,
      exportRequest: null,
      deletionRequest: null,
    });

    const first = await instance.inject({
      method: "POST",
      url: "/v1/account/export-requests",
      headers: auth,
    });
    const repeat = await instance.inject({
      method: "POST",
      url: "/v1/account/export-requests",
      headers: auth,
    });
    expect(first.statusCode).toBe(201);
    expect(repeat.statusCode).toBe(200);
    expect(repeat.json().exportRequest).toEqual(first.json().exportRequest);
    expect(
      store.auditEvents.filter(
        (event) => event.action === "account.export_request",
      ),
    ).toHaveLength(1);

    const other = await instance.inject({
      method: "GET",
      url: "/v1/account",
      headers: otherAuth,
    });
    expect(other.json().exportRequest).toBeNull();
  });

  it("lets a collector cancel a pending deletion request", async () => {
    const instance = await app();

    const missing = await instance.inject({
      method: "DELETE",
      url: "/v1/account/deletion-requests",
      headers: auth,
    });
    expect(missing.statusCode).toBe(404);

    const requested = await instance.inject({
      method: "POST",
      url: "/v1/account/deletion-requests",
      headers: auth,
    });
    expect(requested.statusCode).toBe(201);
    expect(requested.json().deletionRequest).toMatchObject({
      kind: "deletion",
      status: "requested",
    });

    const cancelled = await instance.inject({
      method: "DELETE",
      url: "/v1/account/deletion-requests",
      headers: auth,
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().deletionRequest).toBeNull();
  });
});

describe("production adapter guards", () => {
  it("refuses mock identity in production", () => {
    const previous = process.env.AUTH_ADAPTER;
    process.env.AUTH_ADAPTER = "mock";
    expect(() => createIdentityVerifier("production")).toThrow(/forbidden/);
    if (previous === undefined) delete process.env.AUTH_ADAPTER;
    else process.env.AUTH_ADAPTER = previous;
  });
});
