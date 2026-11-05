import { z } from 'zod';
import { Document } from '@loopstack/common';

/**
 * Content of a {@link HandoffDocument}: a prepared, fully-resolved hand-off to a local tool — either a
 * command to copy and run (a terminal session, an IDE, …) or a URL to open in the browser (a running app's
 * preview). Exactly one of `command`/`url` is set; the card renders a copy button or an open link accordingly.
 *
 * @public
 */
export const HandoffSchema = z
  .object({
    /** Short heading for the card (e.g. "Open the app"). */
    title: z.string(),
    /** Optional one-line explanation. */
    description: z.string().optional(),
    /** The full command to copy and run (already resolved — no placeholders). Mutually exclusive with `url`. */
    command: z.string().optional(),
    /** A URL to open in the browser (e.g. a running app's preview). Mutually exclusive with `command`. */
    url: z.string().optional(),
  })
  .strict();

/**
 * A hand-off card in the run timeline: a command to copy or a URL to open. The emitting workflow resolves it
 * fully (it knows its own workspace and workflow ids and host paths) and decides every text on it. Rendered by
 * the `handoff` widget.
 *
 * @public
 */
@Document({
  name: 'handoff',
  schema: HandoffSchema,
  widget: { widget: 'handoff' },
})
export class HandoffDocument {
  title!: string;
  description?: string;
  command?: string;
  url?: string;
}
