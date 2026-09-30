import { z } from 'zod';
import { Document } from '@loopstack/common';

/** The transition the terminal-handoff widget fires once the local command exits. */
export const HANDOFF_DONE_TRANSITION = 'handoffDone';

/**
 * Content of a {@link TerminalHandoffDocument}: a local command the CLI runs with an inherited TTY (handing
 * the terminal over to it), plus an optional working directory hint for display.
 *
 * @public
 */
export const TerminalHandoffSchema = z
  .object({
    /** The full local command to run (e.g. `docker exec -it -w /workspace <id> claude --continue`). */
    command: z.string(),
    /** Optional cwd shown alongside the command. */
    cwd: z.string().optional(),
  })
  .strict();

/**
 * A hand-off prompt: when `loopstack run` is following a run and this document arms (its `handoffDone`
 * transition is available at the current place), the CLI's `terminal-handoff` widget runs `command` with an
 * inherited TTY — the terminal becomes that process — and fires `handoffDone` when it exits. Generic and
 * agent-neutral: the emitting workflow decides what `command` is and owns the `handoffDone` wait transition.
 *
 * @public
 */
@Document({
  name: 'terminal_handoff',
  schema: TerminalHandoffSchema,
  widget: {
    widget: 'terminal-handoff',
    options: { transition: HANDOFF_DONE_TRANSITION, label: 'Continue in terminal' },
  },
})
export class TerminalHandoffDocument {
  command!: string;
  cwd?: string;
}
