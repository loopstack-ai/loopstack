import type { ClientMessage } from '@loopstack/contracts/events';
import { queryKeys } from '../queries/query-keys.js';

export type QueryKey = readonly unknown[];

/**
 * Maps a server event to the cache keys it stales — the domain knowledge that
 * used to live in Studio's invalidation provider, as a pure, testable function.
 *
 * `llm.response.*` events return no keys (they feed the stream reducer, not
 * the cache), and `stream.reset` returns none either: it means "cursor lost,
 * refetch everything for this environment", which the cache binder must
 * handle as a whole-environment invalidation.
 */
export function resolveInvalidations(message: ClientMessage, envKey: string): QueryKey[] {
  switch (message.type) {
    case 'workflow.created':
      return message.parentId ? [queryKeys.childWorkflows(envKey, message.parentId)] : [];
    case 'workflow.updated': {
      const keys: QueryKey[] = [queryKeys.workflow(envKey, message.id), queryKeys.workflowStatus(envKey, message.id)];
      if (message.parentId) keys.push(queryKeys.childWorkflows(envKey, message.parentId));
      return keys;
    }
    case 'document.created':
      return [queryKeys.documents(envKey, message.workflowId)];
    case 'secret.upserted':
    case 'secret.deleted':
      return [queryKeys.secrets(envKey, message.workspaceId)];
    case 'git.updated':
      return [
        queryKeys.gitStatus(envKey, message.workspaceId),
        queryKeys.gitLog(envKey, message.workspaceId),
        queryKeys.gitRemote(envKey, message.workspaceId),
      ];
    default:
      return [];
  }
}
