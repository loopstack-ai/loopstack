import { stdin } from 'node:process';
import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { IdleOutcome } from '../run/follow.js';
import { resolveHandoff } from '../widgets/registry.js';
import { fetchDocumentWidgets, findActivePrompt } from './discovery.js';
import type { WidgetConfig } from './discovery.js';
import { describePrompt, promptForAnswer } from './prompt.js';

export interface IdleHandlerOptions {
  /** Studio deep link of the followed run — printed on non-TTY pauses. */
  studioUrl?: string;
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

/**
 * Builds the `followRun` onIdle handler: discovers the prompt the run is
 * waiting on, renders it in the terminal, submits the answer against the
 * prompting workflow, and resumes following. Runs raced against the event
 * stream — when the prompt is answered elsewhere (Studio), the signal aborts
 * it and `'external'` is returned. A wait with no prompt but still-running
 * sub-workflows is an orchestration wait (callback), not a question — the
 * handler polls until a prompt appears or the run resumes (`'resumed'`).
 * Input only Studio can collect (a declared widget without a CLI collect
 * implementation) is named explicitly: non-interactive shells stop (exit 3),
 * interactive ones stay attached so an answer given in Studio (or a browser
 * OAuth round-trip) resumes the stream. In non-interactive shells a found
 * prompt is described and following stops (callers exit 3).
 */
export function createIdleHandler(
  client: LoopstackClient,
  rootWorkflowId: string,
  out: NodeJS.WritableStream,
  options: IdleHandlerOptions = {},
): (signal: AbortSignal, onPromptWorkflow: (id: string) => void) => Promise<IdleOutcome> {
  let widgetsPromise: Promise<Map<string, WidgetConfig>> | undefined;
  const workflowWidgets = new Map<string, WidgetConfig[]>();
  let lastAnswerAt = 0;
  let announcedUnsupported: string | undefined;

  return async (signal, onPromptWorkflow): Promise<IdleOutcome> => {
    widgetsPromise ??= fetchDocumentWidgets(client);
    const widgets = await widgetsPromise;

    // The root's waiting event can outrun the sub-workflow that asks the
    // actual question — and while descendants are still running, the wait
    // usually belongs to orchestration (a sub-workflow callback), not the
    // user. Keep polling: a real prompt may appear on a late sub-workflow,
    // or the run resumes by itself and the signal aborts. Parked (waiting/
    // paused) descendants don't count — they can't move on their own, so
    // they end the poll like a waiting root does.
    let discovery = await findActivePrompt(client, rootWorkflowId, widgets, workflowWidgets);
    const renderable = () => !!(discovery.prompt?.document || discovery.prompt?.widget);
    // Grace window: when descendants were running, a quiet tree usually means
    // the parent's callback is in flight — keep polling briefly so the
    // resume (signal abort) wins over a false "stuck waiting" verdict.
    let sawActivity = discovery.hasActiveDescendants;
    let quietPolls = 0;
    for (
      let attempt = 0;
      !renderable() &&
      !discovery.unsupported &&
      (attempt < 4 || discovery.hasActiveDescendants || (sawActivity && quietPolls < 2));
      attempt++
    ) {
      await abortableSleep(attempt < 4 ? 750 : 2000, signal);
      if (signal.aborted) return 'resumed';
      const next = await findActivePrompt(client, rootWorkflowId, widgets, workflowWidgets);
      if (next.hasActiveDescendants) {
        sawActivity = true;
        quietPolls = 0;
      } else if (sawActivity) {
        quietPolls++;
      }
      discovery = {
        prompt: next.prompt ?? discovery.prompt,
        unsupported: next.unsupported,
        hasActiveDescendants: next.hasActiveDescendants,
      };
    }
    if (signal.aborted) return 'resumed';

    // Studio-only input: the widget is declared and interactive, but the CLI
    // has no collect implementation for it. Prefer the widget's own
    // pause-point instruction (e.g. the OAuth sign-in URL); name the widget
    // otherwise.
    if (!renderable() && discovery.unsupported) {
      const { workflow, widgetName, documentName, content } = discovery.unsupported;
      const key = `${workflow.id}:${widgetName}`;
      if (key !== announcedUnsupported) {
        announcedUnsupported = key;
        const hint = resolveHandoff(widgetName, content ?? {});
        if (hint) {
          // The widget's instruction is complete on its own — no Studio
          // suffix (e.g. a browser sign-in doesn't involve Studio at all).
          out.write(`${pc.yellow('⏸')} ${hint}\n`);
        } else {
          const label = documentName ? `${widgetName} (${documentName})` : widgetName;
          out.write(`${pc.yellow('⏸')} waiting for input the CLI can't collect: ${label}\n`);
          if (options.studioUrl) out.write(pc.dim(`⧉ answer in Studio: ${options.studioUrl}\n`));
        }
      }
      if (!stdin.isTTY) return 'stop';
      // Interactive: stay attached — an answer given in Studio (or a browser
      // OAuth round-trip) moves the run, the event aborts the sleep, and
      // following continues.
      await abortableSleep(3_600_000, signal);
      return signal.aborted ? 'resumed' : 'stop';
    }

    const prompt = discovery.prompt;
    // Nothing renderable: either the tree is quiet, or a workflow waits raw
    // (custom signal, webhook). Internal transition names are not a user
    // question — never offer them as a picker. Keep following when this just
    // raced our submitted answer, else stop; the caller prints the waiting
    // line and the resume hint.
    if (!prompt || (!prompt.document && !prompt.widget)) {
      return Date.now() - lastAnswerAt < 10_000 ? 'answered' : 'stop';
    }

    onPromptWorkflow(prompt.workflow.id);

    if (!stdin.isTTY) {
      out.write(`${pc.yellow('⏸')} waiting for input: ${describePrompt(prompt)}\n`);
      if (options.studioUrl) out.write(pc.dim(`⧉ answer in Studio: ${options.studioUrl}\n`));
      return 'stop';
    }

    try {
      const answer = await promptForAnswer(client, prompt, out, { signal });
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
