import { stdin } from 'node:process';
import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import { fetchDocumentWidgets, findActivePrompt } from './discovery.js';
import type { WidgetConfig } from './discovery.js';
import { describePrompt, promptForAnswer } from './prompt.js';

/**
 * Builds the `followRun` onIdle handler: discovers the prompt the run is
 * waiting on, renders it in the terminal, submits the answer against the
 * followed run, and resumes following. In non-interactive shells the prompt
 * is described and following stops (callers exit 3).
 */
export function createIdleHandler(
  client: LoopstackClient,
  rootWorkflowId: string,
  out: NodeJS.WritableStream,
): () => Promise<boolean> {
  let widgetsPromise: Promise<Map<string, WidgetConfig>> | undefined;
  let lastAnswerAt = 0;

  return async (): Promise<boolean> => {
    widgetsPromise ??= fetchDocumentWidgets(client);
    const widgets = await widgetsPromise;

    // The root's waiting event can outrun the sub-workflow that asks the
    // actual question — retry briefly before settling for the raw fallback.
    let prompt = await findActivePrompt(client, rootWorkflowId, widgets);
    for (let attempt = 0; attempt < 4 && (!prompt || !prompt.document); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      prompt = (await findActivePrompt(client, rootWorkflowId, widgets)) ?? prompt;
    }

    if (!prompt) {
      // A waiting event that raced our just-submitted answer — keep following.
      return Date.now() - lastAnswerAt < 10_000;
    }

    if (!stdin.isTTY) {
      out.write(`${pc.yellow('⏸')} waiting for input: ${describePrompt(prompt)}\n`);
      return false;
    }

    const answer = await promptForAnswer(prompt, out);
    if (!answer) return false;

    // The transition is applied to the prompting workflow itself — for
    // sub-workflow prompts its completion propagates to the root via the
    // parent's callback transition.
    await client.processor.run(prompt.workflow.id, {
      transition: { id: answer.transitionId, workflowId: prompt.workflow.id, payload: answer.payload },
    });
    lastAnswerAt = Date.now();
    return true;
  };
}
