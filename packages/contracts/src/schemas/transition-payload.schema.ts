import { z } from 'zod';

export const TransitionPayloadSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  payload: z.any().optional(),
  meta: z.any().optional(),
});

export type TransitionPayload = z.infer<typeof TransitionPayloadSchema>;
