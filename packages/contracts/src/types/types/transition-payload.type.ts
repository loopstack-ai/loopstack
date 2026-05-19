import { z } from 'zod';
import { TransitionPayloadSchema } from '../../schemas/index.js';

export type TransitionPayload = z.infer<typeof TransitionPayloadSchema>;
