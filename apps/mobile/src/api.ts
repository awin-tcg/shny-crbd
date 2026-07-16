import type { Card, Portfolio } from "@cardboard/contracts";
import type { MobileSession } from "./auth";

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getPortfolio(session: MobileSession): Promise<Portfolio> {
  return request<Portfolio>("/v1/portfolio", session);
}

export async function searchCards(
  query: string,
  session: MobileSession,
): Promise<Card[]> {
  const body = await request<{ items: Card[] }>(
    `/v1/cards?q=${encodeURIComponent(query)}&limit=20`,
    session,
  );
  return body.items;
}

async function request<T>(path: string, session: MobileSession): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (session.accessToken)
    headers.authorization = `Bearer ${session.accessToken}`;
  if (session.mockUserId) headers["x-mock-user-id"] = session.mockUserId;
  const response = await fetch(`${baseUrl}${path}`, { headers });
  if (!response.ok)
    throw new Error(`API request failed with ${response.status}`);
  return (await response.json()) as T;
}
