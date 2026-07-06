import { z } from 'zod';
import { ClientMessageBaseSchema } from './client-message-base.schema.js';

const WorkspaceEventBaseSchema = ClientMessageBaseSchema.extend({
  workspaceId: z.string(),
});

/**
 * Emitted when a workspace secret is created or its value is updated.
 */
export const SecretUpsertedEventSchema = WorkspaceEventBaseSchema.extend({
  type: z.literal('secret.upserted'),
});
export type SecretUpsertedEvent = z.infer<typeof SecretUpsertedEventSchema>;

/**
 * Emitted when a workspace secret is deleted.
 */
export const SecretDeletedEventSchema = WorkspaceEventBaseSchema.extend({
  type: z.literal('secret.deleted'),
});
export type SecretDeletedEvent = z.infer<typeof SecretDeletedEventSchema>;

/**
 * Emitted when a workspace's git state changed (e.g. a remote was connected
 * or synced).
 */
export const GitUpdatedEventSchema = WorkspaceEventBaseSchema.extend({
  type: z.literal('git.updated'),
});
export type GitUpdatedEvent = z.infer<typeof GitUpdatedEventSchema>;
