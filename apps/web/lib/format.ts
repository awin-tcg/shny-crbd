import type { Card, Game } from "@cardboard/contracts";

export type VariantDescriptor = Card["variants"][number]["descriptor"];

const gameNames: Record<Game, string> = {
  pokemon: "Pokémon",
  "one-piece": "One Piece",
  gundam: "Gundam",
  "yu-gi-oh": "Yu-Gi-Oh!",
};

export function gameLabel(game: Game): string {
  return gameNames[game];
}

export function variantLabel(descriptor: VariantDescriptor): string {
  return descriptor.kind === "raw"
    ? conditionLabel(descriptor.condition)
    : `${descriptor.grader} ${descriptor.grade}`;
}

export function conditionLabel(condition: string): string {
  return condition.replaceAll("_", " ");
}

export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function signedMoney(cents: number): string {
  return `${cents >= 0 ? "+" : "−"}${money(Math.abs(cents))}`;
}

export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date.length === 10 ? `${date}T00:00:00` : date));
}

export function observedLabel(observedAt: string | null, stale: boolean) {
  if (observedAt === null) return "No observation";
  return `${stale ? "Stale · " : ""}Observed ${shortDate(observedAt)}`;
}
