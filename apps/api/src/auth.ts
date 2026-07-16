import type { FastifyRequest } from "fastify";

export interface Principal {
  userId: string;
  issuer: string;
  subject: string;
}

export interface IdentityVerifier {
  verify(request: FastifyRequest): Promise<Principal | null>;
}

export class MockIdentityVerifier implements IdentityVerifier {
  async verify(request: FastifyRequest): Promise<Principal | null> {
    const userId = request.headers["x-mock-user-id"];
    if (typeof userId !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(userId))
      return null;
    return { userId, issuer: "cardboard:mock", subject: userId };
  }
}

export function createIdentityVerifier(environment: string): IdentityVerifier {
  const adapter = process.env.AUTH_ADAPTER ?? "mock";
  if (environment === "production" && adapter === "mock") {
    throw new Error("AUTH_ADAPTER=mock is forbidden in production");
  }
  if (adapter !== "mock") {
    throw new Error(
      `Identity adapter "${adapter}" is not enabled; select and document a production OIDC provider`,
    );
  }
  return new MockIdentityVerifier();
}
