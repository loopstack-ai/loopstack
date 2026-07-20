import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { ResolvedConnection } from '../config/resolve.js';
import { colorStatus, formatDuration } from '../output/format.js';
import { studioRunUrl } from '../output/studio-link.js';
import { createDocumentRenderer, renderDocumentHistory } from './documents.js';
import type { DocumentRenderer } from './documents.js';

interface CheckpointLike {
  place: string;
  createdAt: string;
}

export interface TrailContext {
  /** Seen-aware renderer — a live follow continues where the history ends. */
  renderer: DocumentRenderer;
  streamedMessageIds: Set<string>;
  streamedToolCallIds: Set<string>;
  /** Children made visible by link documents (`show: 'hidden'` stays hidden). */
  visibleWorkflowIds: Set<string>;
}

/**
 * Prints a run's full transcript: header, step lines (collapsed
 * checkpoints), error, and the run tree's document history in chronological
 * order, railed by nesting depth.
 */
export async function renderRunTrail(
  client: LoopstackClient,
  connection: ResolvedConnection,
  out: NodeJS.WritableStream,
  workflow: WorkflowFullInterface,
  checkpoints: CheckpointLike[],
): Promise<TrailContext> {
  const link = studioRunUrl(connection, workflow.id);
  const title = workflow.title ? ` (${workflow.title})` : '';
  out.write(`${pc.bold(workflow.workflowName)} #${workflow.run}${title} — ${colorStatus(workflow.status)}\n`);
  out.write(pc.dim(`started ${new Date(workflow.createdAt).toLocaleString()}  ${workflow.id}\n`));
  if (link) out.write(pc.dim(`⧉ ${link}\n`));

  // Collapse consecutive checkpoints of the same place (state saves) into
  // one step line spanning entry to exit.
  const steps: { place: string; enteredAt: number; leftAt?: number }[] = [];
  for (const checkpoint of checkpoints) {
    const at = new Date(checkpoint.createdAt).getTime();
    const last = steps[steps.length - 1];
    if (last && last.place === checkpoint.place) continue;
    if (last) last.leftAt = at;
    steps.push({ place: checkpoint.place, enteredAt: at });
  }
  for (const step of steps) {
    if (step.place === 'end') continue;
    const duration = step.leftAt !== undefined ? pc.dim(` (${formatDuration(step.leftAt - step.enteredAt)})`) : '';
    out.write(`${pc.green('✓')} ${step.place}${duration}\n`);
  }
  if (workflow.errorMessage) out.write(`${pc.red('✖')} ${workflow.errorMessage}\n`);

  const streamedMessageIds = new Set<string>();
  const streamedToolCallIds = new Set<string>();
  const visibleWorkflowIds = new Set<string>();
  const renderer = createDocumentRenderer(client, out, {
    studioUrl: (id) => studioRunUrl(connection, id),
    streamedMessageIds,
    streamedToolCallIds,
    visibleWorkflowIds,
  });
  await renderDocumentHistory(client, renderer, workflow.id);

  return { renderer, streamedMessageIds, streamedToolCallIds, visibleWorkflowIds };
}
