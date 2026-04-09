import { z } from 'zod';

export const TransitionPayloadSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  payload: z.unknown().optional(),
  meta: z.unknown().optional(),
});

export type TransitionPayload = z.infer<typeof TransitionPayloadSchema>;
