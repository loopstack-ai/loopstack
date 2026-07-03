import type { LoopstackClient } from '@loopstack/client';
import { SortOrder } from '@loopstack/contracts/enums';
import { CliError } from '../errors.js';

/*
 * The config endpoint joins the SDK with its Phase 4 slice — until then the
 * CLI types this call locally.
 */
interface StudioAppConfig {
  appName: string;
  workflows?: { workflowName: string }[];
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

  const page = await client.workspaces.list({
    filter: { appName: app.appName },
    sortBy: [{ field: 'createdAt', order: SortOrder.DESC }],
    page: 0,
    limit: 1,
  });
  const existing = page.data[0];
  if (existing) return existing.id;

  const created = await client.workspaces.create({ title: 'CLI', appName: app.appName });
  return created.id;
}
