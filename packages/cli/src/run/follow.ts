import pc from 'picocolors';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { ClientMessage } from '@loopstack/contracts/events';
import { CliError } from '../errors.js';
import { formatDuration } from '../output/format.js';

export interface FollowOutcome {
  status: WorkflowState;
  durationMs: number;
}

/**
 * How an idle (HITL) phase ended: `answered` — submitted from the terminal,
 * keep following; `external` — a prompt was resolved outside the terminal
 * (Studio), keep following; `resumed` — the run moved on by itself (e.g. a
 * sub-workflow callback) before any prompt was shown, keep following
 * silently; `stop` — nothing to collect here (non-TTY or user abort),
 * stop following.
 */
export type IdleOutcome = 'answered' | 'external' | 'resumed' | 'stop';

export interface FollowOptions {
  /**
   * Called when the run parks in waiting/paused — the HITL hook. Runs
   * concurrently with event consumption: when the prompt's workflow leaves
   * its wait state (answered in Studio), the signal aborts the prompt.
   * `onPromptWorkflow` reports which workflow actually carries the prompt
   * (often a sub-workflow) once discovered.
   */
  onIdle?: (signal: AbortSignal, onPromptWorkflow: (id: string) => void) => Promise<IdleOutcome>;
  /** Start the idle hook immediately — attaching to an already-waiting run. */
  initiallyIdle?: boolean;
  /**
   * Called when the run (or one of its sub-workflows) saved a document —
   * the hook behind live message rendering. The event carries no content;
   * the handler fetches. `depth` is the workflow's nesting level below the
   * followed root (0 = the root itself) — the renderer's gutter rail.
   */
  onDocument?: (workflowId: string, depth: number) => Promise<void>;
  /**
   * Collects the ids of messages whose tokens streamed live. Share the set
   * with the document renderer so it skips re-printing exactly that text —
   * and nothing else.
   */
  streamedMessageIds?: Set<string>;
  /**
   * Collects the ids of tool calls rendered live from stream events. Shared
   * with the document renderer so the persisted message doesn't re-print
   * exactly those calls (providers without tool_call events still render
   * theirs from the document).
   */
  streamedToolCallIds?: Set<string>;
  /**
   * Sub-workflows visible in the transcript (maintained by the document
   * renderer from link documents). When provided, streamed tokens of
   * sub-workflows without a link (`show: 'hidden'`) are suppressed —
   * Studio parity. Omit to stream everything.
   */
  visibleWorkflowIds?: ReadonlySet<string>;
}

const TERMINAL_STATES: readonly WorkflowState[] = [
  WorkflowState.Completed,
  WorkflowState.Failed,
  WorkflowState.Canceled,
];

const IDLE_STATES: readonly WorkflowState[] = [WorkflowState.Waiting, WorkflowState.Paused];

interface PendingPrompt {
  result: Promise<IdleOutcome>;
  controller: AbortController;
  /** The prompting workflow, once discovery finds it (may be a sub-workflow). */
  workflowId?: string;
}

/**
 * Consumes the event stream for one run and renders it live: a step line per
 * place (with duration), LLM tokens inline, until the run reaches a terminal
 * or waiting state. Rendering goes to `out` — stderr in `--json` mode so
 * stdout stays machine-readable.
 *
 * While an idle prompt is open the stream keeps being consumed — an answer
 * given in Studio aborts the terminal prompt and following resumes seamlessly.
 */
export async function followRun(
  events: AsyncIterableIterator<ClientMessage>,
  workflowId: string,
  out: NodeJS.WritableStream,
  options: FollowOptions = {},
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
    out.write(`${mark} ${pc.dim(`${currentPlace} (${formatDuration(Date.now() - placeEnteredAt)})`)}\n`);
    currentPlace = undefined;
  };

  const outcome = (status: WorkflowState): FollowOutcome => ({ status, durationMs: Date.now() - startedAt });

  // The run's family: the followed root plus every sub-workflow spawned
  // under it, each with its nesting depth (root = 0). LLM tokens and
  // documents from sub-workflows render too, behind a `│ ` rail per level.
  const family = new Map<string, number>([[workflowId, 0]]);
  const rail = (depth: number) => (depth > 0 ? pc.dim('│ '.repeat(depth)) : '');

  /** Renders one event; returns the follow outcome when the run ended, 'idle' on pause. */
  const handleEvent = (event: ClientMessage): FollowOutcome | 'idle' | undefined => {
    if (!('workflowId' in event)) return undefined;
    // Sub-workflows join the family through any event naming their parent —
    // `workflow.updated` carries `parentId` too, so this also works when
    // attaching to a run whose creation events are already past.
    if ('parentId' in event && event.parentId !== undefined && !family.has(event.workflowId)) {
      const parentDepth = family.get(event.parentId);
      if (parentDepth !== undefined) family.set(event.workflowId, parentDepth + 1);
    }
    if (event.type === 'workflow.created') return undefined;
    if (!family.has(event.workflowId)) return undefined;

    switch (event.type) {
      case 'llm.response.start':
        options.streamedMessageIds?.add(event.messageId);
        break;
      case 'llm.response.text_delta': {
        options.streamedMessageIds?.add(event.messageId);
        const depth = family.get(event.workflowId) ?? 0;
        // Hidden sub-workflows (no link document) stream nothing — Studio parity.
        if (depth > 0 && options.visibleWorkflowIds && !options.visibleWorkflowIds.has(event.workflowId)) {
          break;
        }
        // Streamed tokens are an assistant message — carry the same role
        // prefix as document-rendered messages, railed by nesting depth.
        // Messages are paragraph-spaced: a blank line opens each block.
        const prefix = rail(depth);
        if (!streaming) out.write(`\n${prefix}${pc.dim('assistant:')}\n${prefix}`);
        streaming = true;
        out.write(event.delta.split('\n').join(`\n${prefix}`));
        break;
      }
      case 'llm.response.tool_call': {
        options.streamedToolCallIds?.add(event.id);
        const depth = family.get(event.workflowId) ?? 0;
        // Hidden sub-workflows (no link document) stream nothing — Studio parity.
        if (depth > 0 && options.visibleWorkflowIds && !options.visibleWorkflowIds.has(event.workflowId)) {
          break;
        }
        endTokenLine();
        out.write(`${rail(depth)}${pc.dim(`⚒ ${event.name} ${JSON.stringify(event.args ?? {})}`)}\n`);
        break;
      }
      case 'llm.response.done':
      case 'llm.response.error':
        endTokenLine();
        break;
      case 'workflow.updated': {
        if (event.workflowId !== workflowId) break;
        rootStatus = event.status;
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
          return outcome(event.status);
        }
        if (IDLE_STATES.includes(event.status)) {
          finishStep(pc.yellow('⏸'));
          return 'idle';
        }
        break;
      }
    }
    return undefined;
  };

  const startPrompt = (): PendingPrompt => {
    const controller = new AbortController();
    const pending: PendingPrompt = { controller } as PendingPrompt;
    pending.result = options.onIdle!(controller.signal, (id) => {
      pending.workflowId = id;
    });
    return pending;
  };

  /** True when this event shows the prompt's workflow leaving its wait state. */
  const resolvesPrompt = (prompt: PendingPrompt, event: ClientMessage): boolean => {
    if (event.type !== 'workflow.updated' || !('workflowId' in event)) return false;
    const promptWorkflowId = prompt.workflowId ?? workflowId;
    return event.workflowId === promptWorkflowId && !IDLE_STATES.includes(event.status);
  };

  // The root's last known status — decides whether a resolved prompt must
  // re-arm the idle hook: in multi-prompt sequences (sub-workflows asking one
  // question after another) the root stays parked the whole time and never
  // emits another waiting event, so waiting for one would stall the follow.
  let rootStatus: WorkflowState | undefined = options.initiallyIdle ? WorkflowState.Waiting : undefined;
  const rearmIfStillParked = () => {
    if (rootStatus !== undefined && IDLE_STATES.includes(rootStatus) && options.onIdle) {
      prompt = startPrompt();
    }
  };

  let prompt: PendingPrompt | null = options.initiallyIdle && options.onIdle ? startPrompt() : null;
  let pendingNext: Promise<IteratorResult<ClientMessage>> | null = null;
  const pullNext = () => (pendingNext ??= events.next());

  while (true) {
    let event: ClientMessage;

    if (prompt) {
      const raced = await Promise.race([
        pullNext().then((result) => ({ kind: 'event' as const, result })),
        prompt.result.then((idle) => ({ kind: 'idle' as const, idle })),
      ]);
      if (raced.kind === 'idle') {
        prompt = null;
        if (raced.idle === 'stop') return outcome(WorkflowState.Waiting);
        if (raced.idle === 'external') out.write(`${pc.green('✓')} answered in Studio\n`);
        rearmIfStillParked();
        continue;
      }
      pendingNext = null;
      if (raced.result.done) throw new CliError('Event stream ended before the run reached a final state.');
      event = raced.result.value;

      // Track the root's status before deciding about re-arming — the event
      // in hand may be the root resuming.
      if (event.type === 'workflow.updated' && 'workflowId' in event && event.workflowId === workflowId) {
        rootStatus = event.status;
      }

      if (resolvesPrompt(prompt, event)) {
        prompt.controller.abort();
        const idle = await prompt.result;
        prompt = null;
        if (idle === 'stop') return outcome(WorkflowState.Waiting);
        if (idle === 'external') out.write(`${pc.green('✓')} answered in Studio\n`);
        rearmIfStillParked();
      }
    } else {
      const { value, done } = await pullNext();
      pendingNext = null;
      if (done) throw new CliError('Event stream ended before the run reached a final state.');
      event = value;
    }

    if (
      event.type === 'document.created' &&
      'workflowId' in event &&
      family.has(event.workflowId) &&
      options.onDocument
    ) {
      endTokenLine();
      await options.onDocument(event.workflowId, family.get(event.workflowId) ?? 0);
      continue;
    }

    const handled = handleEvent(event);
    if (handled === 'idle') {
      if (!options.onIdle) return outcome(WorkflowState.Waiting);
      prompt ??= startPrompt();
    } else if (handled) {
      return handled;
    }
  }
}
