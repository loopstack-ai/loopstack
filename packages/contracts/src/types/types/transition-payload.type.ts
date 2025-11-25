import { z } from 'zod';
import { TransitionPayloadSchema } from '../../schemas';

export type TransitionPayload = z.infer<typeof TransitionPayloadSchema>