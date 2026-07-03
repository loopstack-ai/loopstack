import type { LoopstackClient } from '@loopstack/client';
import { CliError } from '../errors.js';

/*
 * The workspaces and config endpoints join the SDK with the Phase 4 slices —
 * until then the CLI types these two calls locally.
 */
interface StudioAppConfig {
  appName: string;
  workflows?: { workflowName: string }[];
}

interface WorkspaceItem {
  id: string;
  appName: string;
}

/**
 * Picks the workspace for a run: the explicit flag, then the environment's
 * pinned `workspaceId` from the config file, then the newest workspace of the
 * app declaring the workflow — created on the fly when none exists yet.
 */
export async function resolveWorkspaceId(
  client: LoopstackClient,
  workflowName: string,
  explicit?: string,
  pinned?: string,
): Promise<string> {
  if (explicit) return explicit;
  if (pinned) return pinned;

  const apps = await client.http.get<StudioAppConfig[]>('/api/v1/config/apps');
  const app = apps.find((candidate) => candidate.workflows?.some((workflow) => workflow.workflowName === workflowName));
  if (!app) {
    const available = apps.flatMap((candidate) => candidate.workflows?.map((w) => w.workflowName) ?? []);
    throw new CliError(
      `Unknown workflow "${workflowName}". Available workflows: ${available.sort().join(', ') || '(none)'}`,
    );
  }

  const page = await client.http.get<{ data: WorkspaceItem[] }>('/api/v1/workspaces', {
    sortBy: [{ field: 'createdAt', order: 'DESC' }],
    page: 0,
    limit: 100,
  });
  const existing = page.data.find((workspace) => workspace.appName === app.appName);
  if (existing) return existing.id;

  const created = await client.http.post<WorkspaceItem>('/api/v1/workspaces', {
    title: 'CLI',
    appName: app.appName,
  });
  return created.id;
}
