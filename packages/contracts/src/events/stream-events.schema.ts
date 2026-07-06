import { z } from 'zod';
import { ClientMessageBaseSchema } from './client-message-base.schema.js';

/**
 * Emitted by the event stream itself when a client reconnects with a
 * `Last-Event-ID` that is no longer in the replay buffer. Consumers must
 * treat their local view as stale and refetch state.
 */
export const StreamResetEventSchema = ClientMessageBaseSchema.extend({
  type: z.literal('stream.reset'),
});
export type StreamResetEvent = z.infer<typeof StreamResetEventSchema>;
