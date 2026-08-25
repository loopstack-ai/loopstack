import { stdin } from 'node:process';
import { createInterface } from 'node:readline/promises';
import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { ClientMessage } from '@loopstack/contracts/events';
import { fetchDocumentWidgets, findActivePrompt } from '../hitl/discovery.js';
import type { ActivePrompt, WidgetConfig } from '../hitl/discovery.js';
import { followRun } from './follow.js';
import type { FollowOptions, FollowOutcome } from './follow.js';

/**
 * Failed runs follow the same rule as waiting ones: the place decides what
 * is answerable. On failure the CLI runs the same prompt discovery as the
 * idle path — a run parked at a custom error place surfaces its recovery
 * button — and always offers retry, the equivalent of Studio's Retry button
 * (a retry is just another processing session of the same workflow).
 * Interactive terminals only; CI keeps the plain exit-1 contract.
 */
export async function offerRetry(
  client: LoopstackClient,
  workflowId: string,
  events: AsyncIterableIterator<ClientMessage>,
  out: NodeJS.WritableStream,
  statusOut: NodeJS.WritableStream,
  followOptions: FollowOptions,
  outcome: FollowOutcome,
): Promise<FollowOutcome> {
  let widgets: Map<string, WidgetConfig> | undefined;

  while (outcome.status === WorkflowState.Failed && stdin.isTTY) {
    const failed = await client.workflows.get(workflowId).catch(() => undefined);
    statusOut.write(`${pc.red('✖')} failed${failed?.errorMessage ? `: ${failed.errorMessage}` : ''}\n`);

    widgets ??= await fetchDocumentWidgets(client).catch(() => new Map<string, WidgetConfig>());
    const discovery = await findActivePrompt(client, workflowId, widgets).catch(() => undefined);
    const prompt =
      discovery?.prompt && (discovery.prompt.document || discovery.prompt.widget) ? discovery.prompt : undefined;

    const action = await askFailureAction(prompt, statusOut);
    if (action === undefined) break;

    if (action === 'retry') {
      await client.processor.run(workflowId, {});
    } else {
      await client.processor.run(action.workflowId, {
        transition: { id: action.transitionId, workflowId: action.workflowId, payload: action.payload },
      });
    }
    outcome = await followRun(events, workflowId, out, followOptions);
  }
  return outcome;
}

interface FailureTransition {
  workflowId: string;
  transitionId: string;
  payload: unknown;
}

async function askFailureAction(
  prompt: ActivePrompt | undefined,
  statusOut: NodeJS.WritableStream,
): Promise<FailureTransition | 'retry' | undefined> {
  const rl = createInterface({ input: stdin, output: statusOut });
  try {
    // A workflow-level widget active in the failed place (e.g. a Recover
    // button) renders as the first option, retry as the standing second.
    const transitionId = prompt?.widget?.options?.transition as string | undefined;
    const available = prompt?.workflow.availableTransitions?.map((transition) => transition.id) ?? [];
    const offered =
      prompt && transitionId && available.includes(transitionId)
        ? { workflowId: prompt.workflow.id, transitionId }
        : undefined;

    if (offered) {
      const label = (prompt?.widget?.options?.label as string | undefined) ?? offered.transitionId;
      statusOut.write(`  ${pc.bold('1')}. ${label}\n`);
      statusOut.write(pc.dim('  r. retry the failed step\n'));
      const raw = (await rl.question(`${pc.bold('action:')} `)).trim().toLowerCase();
      if (raw === '1' || raw === label.toLowerCase()) return { ...offered, payload: {} };
      if (raw === 'r' || raw === 'retry') return 'retry';
      return undefined;
    }

    const raw = (await rl.question(`${pc.bold('retry? [y/N]:')} `)).trim().toLowerCase();
    return raw === 'y' || raw === 'yes' ? 'retry' : undefined;
  } catch {
    // Closed stdin (Ctrl+D) declines.
    return undefined;
  } finally {
    rl.close();
  }
}
