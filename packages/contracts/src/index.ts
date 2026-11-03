import { z } from "zod";

export const gameSchema = z.enum([
  "pokemon",
  "one-piece",
  "gundam",
  "yu-gi-oh",
]);
export type Game = z.infer<typeof gameSchema>;

export const rawConditionSchema = z.enum([
  "near_mint",
  "lightly_played",
  "moderately_played",
  "heavily_played",
  "damaged",
]);
export type RawCondition = z.infer<typeof rawConditionSchema>;

export const rawVariantSchema = z.object({
  kind: z.literal("raw"),
  condition: rawConditionSchema,
});
export const gradedVariantSchema = z.object({
  kind: z.literal("graded"),
  grader: z.string().trim().min(1).max(24),
  grade: z.string().trim().min(1).max(24),
});
export const variantSchema = z.discriminatedUnion("kind", [
  rawVariantSchema,
  gradedVariantSchema,
]);
export type Variant = z.infer<typeof variantSchema>;

export const cardSchema = z.object({
  id: z.string().uuid(),
  providerId: z.string(),
  game: gameSchema,
  name: z.string(),
  setName: z.string(),
  number: z.string(),
  rarity: z.string(),
  language: z.string(),
  imageUrl: z.string().url(),
  variants: z.array(
    z.object({
      id: z.string().uuid(),
      descriptor: variantSchema,
      marketCents: z.number().int().nonnegative().nullable(),
      currency: z.literal("USD"),
      observedAt: z.string().datetime().nullable(),
      stale: z.boolean(),
    }),
  ),
});
export type Card = z.infer<typeof cardSchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  game: gameSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createLotSchema = z
  .object({
    cardId: z.string().uuid(),
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100_000),
    purchaseDate: z.string().date(),
    totalCostCents: z.number().int().min(0).max(2_147_483_647),
    notes: z.string().trim().max(1_000).optional(),
  })
  .strict();
export const updateLotSchema = createLotSchema
  .omit({ cardId: true, variantId: true })
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  );
export type CreateLot = z.infer<typeof createLotSchema>;
export type UpdateLot = z.infer<typeof updateLotSchema>;

export const lotSchema = createLotSchema.extend({
  id: z.string().uuid(),
  userId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Lot = z.infer<typeof lotSchema>;

export const portfolioLineSchema = z.object({
  lot: lotSchema,
  card: cardSchema.omit({ variants: true }),
  variant: cardSchema.shape.variants.element,
  marketValueCents: z.number().int().nonnegative().nullable(),
  gainLossCents: z.number().int().nullable(),
});

export const snapshotSchema = z.object({
  date: z.string().date(),
  marketValueCents: z.number().int().nonnegative(),
  costBasisCents: z.number().int().nonnegative(),
  valuedItems: z.number().int().nonnegative(),
  unpricedItems: z.number().int().nonnegative(),
});
export type PortfolioSnapshot = z.infer<typeof snapshotSchema>;

export const portfolioSchema = z.object({
  marketValueCents: z.number().int().nonnegative(),
  costBasisCents: z.number().int().nonnegative(),
  gainLossCents: z.number().int(),
  valuedItems: z.number().int().nonnegative(),
  unpricedItems: z.number().int().nonnegative(),
  lines: z.array(portfolioLineSchema),
  snapshots: z.array(snapshotSchema),
});
export type Portfolio = z.infer<typeof portfolioSchema>;

export const lifecycleRequestSchema = z.object({
  kind: z.enum(["export", "deletion"]),
  status: z.literal("requested"),
  requestedAt: z.string().datetime(),
});
export type LifecycleRequest = z.infer<typeof lifecycleRequestSchema>;

export const accountSchema = z.object({
  userId: z.string(),
  issuer: z.string(),
  /** Whether the active identity adapter supports ending a session. */
  sessionManaged: z.boolean(),
  lotCount: z.number().int().nonnegative(),
  exportRequest: lifecycleRequestSchema.nullable(),
  deletionRequest: lifecycleRequestSchema.nullable(),
});
export type Account = z.infer<typeof accountSchema>;

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  requestId: z.string(),
});
