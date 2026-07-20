import { z } from 'zod';

/**
 * Envelope fields present on every message sent over the client event stream.
 */
export const ClientMessageBaseSchema = z.object({
  userId: z.string().nullable(),
  workerId: z.string(),
});
export type ClientMessageBase = z.infer<typeof ClientMessageBaseSchema>;
