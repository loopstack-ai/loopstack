import { z } from 'zod';
import { Document } from '@loopstack/common';

/** The transition the terminal-handoff widget fires once the local command exits. */
export const HANDOFF_DONE_TRANSITION = 'handoffDone';

/**
 * Content of a {@link TerminalHandoffDocument}: a local command the CLI runs with an inherited TTY (handing
 * the terminal over to it), an optional working directory hint for display, and the texts of the card.
 *
 * @public
 */
export const TerminalHandoffSchema = z
  .object({
    /** The full local command to run (e.g. `docker exec -it -w /workspace <id> bash`). */
    command: z.string(),
    /** Optional cwd shown alongside the command. */
    cwd: z.string().optional(),
    /** Short heading for the card (e.g. "Interactive session"). */
    title: z.string().optional(),
    /** Optional one-line explanation. */
    description: z.string().optional(),
  })
  .strict();

/**
 * A hand-off prompt that gives the user's terminal to a local command. When `loopstack run` is following a run
 * and this document arms (its `handoffDone` transition is available at the current place), the CLI's
 * `terminal-handoff` widget runs `command` with an inherited TTY — the terminal becomes that process — and fires
 * `handoffDone` when it exits. Studio renders the same document as a copy-the-command card with a button that
 * fires `handoffDone` by hand, for a run nobody is following. The emitting workflow decides what `command` is
 * and what the card says, and owns the `handoffDone` wait transition.
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
  title?: string;
  description?: string;
}
