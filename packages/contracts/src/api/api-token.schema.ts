import { z } from 'zod';

export const ApiTokenCreateSchema = z.object({
  name: z.string().min(1).max(100),
  /** Days until expiry. Omit for a non-expiring token. */
  expiresInDays: z.number().int().min(1).max(365).optional(),
});
export type ApiTokenCreateInterface = z.infer<typeof ApiTokenCreateSchema>;

export const ApiTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
});
export type ApiTokenInterface = z.infer<typeof ApiTokenSchema>;

/** Returned once on creation — the only time the plaintext token is visible. */
export const ApiTokenCreatedSchema = ApiTokenSchema.extend({
  token: z.string(),
});
export type ApiTokenCreatedInterface = z.infer<typeof ApiTokenCreatedSchema>;
