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
    case 'workflow.created': {
      // The plural prefix stales every workflow list (Runs page, landing page, any useWorkflowList),
      // so runs started by cron/webhook/CLI/another client appear without a manual refresh.
      // Workspace lists too: a workspace list may be filtered by what its runs are doing.
      const keys: QueryKey[] = [queryKeys.workflows(envKey), queryKeys.workspaces(envKey)];
      if (message.parentId) keys.push(queryKeys.childWorkflows(envKey, message.parentId));
      return keys;
    }
    case 'workflow.updated': {
      const keys: QueryKey[] = [
        queryKeys.workflow(envKey, message.id),
        queryKeys.workflowStatus(envKey, message.id),
        // Keep list views' status columns current. The per-key debounce collapses update bursts.
        queryKeys.workflows(envKey),
        // A run changing state can move its workspace in or out of a list filtered by activity.
        queryKeys.workspaces(envKey),
      ];
      if (message.parentId) keys.push(queryKeys.childWorkflows(envKey, message.parentId));
      return keys;
    }
    case 'document.created':
      // Documents are not invalidated wholesale: a run's list can be arbitrarily long, so the cache binder
      // fetches only what changed since its newest row and merges that in (see `useLiveDocuments`).
      return [];
    case 'secret.upserted':
    case 'secret.deleted':
      return [queryKeys.secrets(envKey, message.workspaceId)];
    case 'environment.updated':
      return [queryKeys.environments(envKey, message.workspaceId)];
    case 'git.updated':
      return [
        queryKeys.gitStatus(envKey, message.workspaceId),
        queryKeys.gitLog(envKey, message.workspaceId),
        queryKeys.gitRemote(envKey, message.workspaceId),
        // A run can add a repository to the checkout, so the list is part of what git.updated invalidates.
        queryKeys.gitRepos(envKey, message.workspaceId),
      ];
    default:
      return [];
  }
}
