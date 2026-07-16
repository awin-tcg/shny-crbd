import type { Card } from "@cardboard/contracts";

const observedAt = "2026-07-15T12:00:00.000Z";

export const cards: Card[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    providerId: "mock:pokemon:base1-4",
    game: "pokemon",
    name: "Charizard",
    setName: "Base Set",
    number: "4/102",
    rarity: "Rare Holo",
    language: "English",
    imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
    variants: [
      {
        id: "11111111-1111-4111-8111-111111111112",
        descriptor: { kind: "raw", condition: "near_mint" },
        marketCents: 42_500,
        currency: "USD",
        observedAt,
        stale: false,
      },
      {
        id: "11111111-1111-4111-8111-111111111113",
        descriptor: { kind: "graded", grader: "PSA", grade: "10" },
        marketCents: 1_175_000,
        currency: "USD",
        observedAt,
        stale: false,
      },
    ],
  },
  {
    id: "22222222-2222-4222-8222-222222222221",
    providerId: "mock:one-piece:op05-119",
    game: "one-piece",
    name: "Monkey.D.Luffy",
    setName: "Awakening of the New Era",
    number: "OP05-119",
    rarity: "Secret Rare",
    language: "English",
    imageUrl: "https://images.example.com/one-piece/op05-119.png",
    variants: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        descriptor: { kind: "raw", condition: "near_mint" },
        marketCents: 9_800,
        currency: "USD",
        observedAt,
        stale: false,
      },
    ],
  },
  {
    id: "33333333-3333-4333-8333-333333333331",
    providerId: "mock:gundam:gd01-001",
    game: "gundam",
    name: "RX-78-2 Gundam",
    setName: "Newtype Rising",
    number: "GD01-001",
    rarity: "Legend Rare",
    language: "English",
    imageUrl: "https://images.example.com/gundam/gd01-001.png",
    variants: [
      {
        id: "33333333-3333-4333-8333-333333333332",
        descriptor: { kind: "raw", condition: "near_mint" },
        marketCents: null,
        currency: "USD",
        observedAt: null,
        stale: false,
      },
    ],
  },
  {
    id: "44444444-4444-4444-8444-444444444441",
    providerId: "mock:yugioh:lob-001",
    game: "yu-gi-oh",
    name: "Blue-Eyes White Dragon",
    setName: "Legend of Blue Eyes White Dragon",
    number: "LOB-001",
    rarity: "Ultra Rare",
    language: "English",
    imageUrl: "https://images.example.com/yugioh/lob-001.png",
    variants: [
      {
        id: "44444444-4444-4444-8444-444444444442",
        descriptor: { kind: "graded", grader: "PSA", grade: "10" },
        marketCents: 72_000,
        currency: "USD",
        observedAt,
        stale: false,
      },
    ],
  },
];

export const demoUserId = "demo-user";
export const secondUserId = "other-user";
