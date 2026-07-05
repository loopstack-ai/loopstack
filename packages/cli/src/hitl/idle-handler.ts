import { stdin } from 'node:process';
import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { IdleOutcome } from '../run/follow.js';
import { fetchDocumentWidgets, findActivePrompt } from './discovery.js';
import type { WidgetConfig } from './discovery.js';
import { describePrompt, promptForAnswer } from './prompt.js';

export interface IdleHandlerOptions {
  /** Studio deep link of the followed run — printed on handoffs and non-TTY pauses. */
  studioUrl?: string;
  /** Answer field forms in $EDITOR even when Studio is available. */
  editor?: boolean;
}

const abortableSleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

/** Resolves when the signal aborts — the form-handoff wait state. */
const aborted = (signal: AbortSignal) =>
  new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }));

/**
 * Builds the `followRun` onIdle handler: discovers the prompt the run is
 * waiting on, renders it in the terminal, submits the answer against the
 * prompting workflow, and resumes following. Runs raced against the event
 * stream — when the prompt is answered elsewhere (Studio), the signal aborts
 * it and `'external'` is returned. In non-interactive shells the prompt is
 * described and following stops (callers exit 3).
 */
export function createIdleHandler(
  client: LoopstackClient,
  rootWorkflowId: string,
  out: NodeJS.WritableStream,
  options: IdleHandlerOptions = {},
): (signal: AbortSignal, onPromptWorkflow: (id: string) => void) => Promise<IdleOutcome> {
  let widgetsPromise: Promise<Map<string, WidgetConfig>> | undefined;
  let lastAnswerAt = 0;

  return async (signal, onPromptWorkflow): Promise<IdleOutcome> => {
    widgetsPromise ??= fetchDocumentWidgets(client);
    const widgets = await widgetsPromise;

    // The root's waiting event can outrun the sub-workflow that asks the
    // actual question — retry briefly before settling for the raw fallback.
    let prompt = await findActivePrompt(client, rootWorkflowId, widgets);
    for (let attempt = 0; attempt < 4 && (!prompt || !prompt.document); attempt++) {
      if (signal.aborted) return 'external';
      await abortableSleep(750, signal);
      prompt = (await findActivePrompt(client, rootWorkflowId, widgets)) ?? prompt;
    }
    if (signal.aborted) return 'external';

    if (!prompt) {
      // A waiting event that raced our just-submitted answer — keep following.
      return Date.now() - lastAnswerAt < 10_000 ? 'answered' : 'stop';
    }

    onPromptWorkflow(prompt.workflow.id);

    if (!stdin.isTTY) {
      out.write(`${pc.yellow('⏸')} waiting for input: ${describePrompt(prompt)}\n`);
      if (options.studioUrl) out.write(pc.dim(`⧉ answer in Studio: ${options.studioUrl}\n`));
      return 'stop';
    }

    try {
      const answer = await promptForAnswer(prompt, out, {
        signal,
        studioUrl: options.studioUrl,
        useEditor: options.editor,
      });
      if (answer === 'handoff') {
        await aborted(signal);
        return 'external';
      }
      if (!answer) return 'stop';

      // The transition is applied to the prompting workflow itself — for
      // sub-workflow prompts its completion propagates to the root via the
      // parent's callback transition.
      await client.processor.run(prompt.workflow.id, {
        transition: { id: answer.transitionId, workflowId: prompt.workflow.id, payload: answer.payload },
      });
      lastAnswerAt = Date.now();
      return 'answered';
    } catch (error) {
      if (signal.aborted) return 'external';
      // Ctrl+D / closed stdin rejects the open question with an AbortError
      // that is not ours — treat it as "nothing to collect", not a crash.
      if (error instanceof Error && error.name === 'AbortError') return 'stop';
      // A blocking $EDITOR session can outlive the prompt (answered in Studio
      // meanwhile) — a rejected submit against a no-longer-waiting workflow
      // is an external resolution, not a failure.
      const current = await client.workflows.get(prompt.workflow.id).catch(() => undefined);
      if (current && current.status !== WorkflowState.Waiting && current.status !== WorkflowState.Paused) {
        return 'external';
      }
      throw error;
    }
  };
}
