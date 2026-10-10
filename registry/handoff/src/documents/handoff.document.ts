import { z } from 'zod';
import { Document } from '@loopstack/common';

/** Tag marking a document for the Studio "Handoff" sidebar panel (and its inline card renderer). */
export const HANDOFF_TAG = 'handoff';

/**
 * Content of a {@link HandoffDocument}: a prepared, fully-resolved hand-off to a local tool — either a
 * command to copy and run (a terminal session, an IDE, …) or a URL to open in the browser (a running app's
 * preview). Exactly one of `command`/`url` is set; the card renders a copy button or an open link accordingly.
 *
 * @public
 */
export const HandoffSchema = z
  .object({
    /** Short heading for the card (e.g. "Continue in terminal", "Open in Zed", "Open the app"). */
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
 * A per-run hand-off command surfaced in the Studio "Handoff" sidebar panel. A workflow emits one (fully
 * resolved — it knows its own workspace/workflow ids and host paths) when a hand-off becomes relevant; the
 * panel shows every non-invalidated `handoff`-tagged document for the run in view, live via SSE, and the run
 * timeline renders the same card inline. Generic: any workflow can emit these, and any future document type
 * carrying the {@link HANDOFF_TAG} tag renders in the panel via its own widget.
 *
 * @public
 */
@Document({
  name: 'handoff',
  tags: [HANDOFF_TAG],
  schema: HandoffSchema,
  widget: { widget: 'handoff' },
})
export class HandoffDocument {
  title!: string;
  description?: string;
  command?: string;
  url?: string;
}
