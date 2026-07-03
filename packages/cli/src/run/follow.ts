import pc from 'picocolors';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { ClientMessage } from '@loopstack/contracts/events';
import { CliError } from '../errors.js';
import { formatDuration } from '../output/format.js';

export interface FollowOutcome {
  status: WorkflowState;
  durationMs: number;
}

const TERMINAL_STATES: readonly WorkflowState[] = [
  WorkflowState.Completed,
  WorkflowState.Failed,
  WorkflowState.Canceled,
];

const IDLE_STATES: readonly WorkflowState[] = [WorkflowState.Waiting, WorkflowState.Paused];

/**
 * Consumes the event stream for one run and renders it live: a step line per
 * place (with duration), LLM tokens inline, until the run reaches a terminal
 * or waiting state. Rendering goes to `out` — stderr in `--json` mode so
 * stdout stays machine-readable.
 */
export async function followRun(
  events: AsyncIterableIterator<ClientMessage>,
  workflowId: string,
  out: NodeJS.WritableStream,
): Promise<FollowOutcome> {
  const startedAt = Date.now();
  let currentPlace: string | undefined;
  let placeEnteredAt = startedAt;
  let streaming = false;

  const endTokenLine = () => {
    if (!streaming) return;
    out.write('\n');
    streaming = false;
  };

  const finishStep = (mark = pc.green('✓')) => {
    if (!currentPlace) return;
    endTokenLine();
    out.write(`${mark} ${currentPlace} ${pc.dim(`(${formatDuration(Date.now() - placeEnteredAt)})`)}\n`);
    currentPlace = undefined;
  };

  for await (const event of events) {
    if (!('workflowId' in event) || event.workflowId !== workflowId) continue;

    switch (event.type) {
      case 'llm.response.text_delta':
        streaming = true;
        out.write(event.delta);
        break;
      case 'llm.response.done':
      case 'llm.response.error':
        endTokenLine();
        break;
      case 'workflow.updated': {
        if (event.place && event.place !== currentPlace) {
          finishStep();
          // 'end' is the framework's terminal place — the summary line covers it.
          if (event.place !== 'end') {
            currentPlace = event.place;
            placeEnteredAt = Date.now();
            if (!TERMINAL_STATES.includes(event.status)) {
              out.write(pc.dim(`▸ ${currentPlace}\n`));
            }
          }
        }
        if (TERMINAL_STATES.includes(event.status)) {
          endTokenLine();
          return { status: event.status, durationMs: Date.now() - startedAt };
        }
        if (IDLE_STATES.includes(event.status)) {
          finishStep(pc.yellow('⏸'));
          return { status: event.status, durationMs: Date.now() - startedAt };
        }
        break;
      }
    }
  }

  throw new CliError('Event stream ended before the run reached a final state.');
}
