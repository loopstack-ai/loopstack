import { z } from 'zod';
import { Document } from '@loopstack/common';
import { HANDOFF_TAG } from './handoff.document.js';

/**
 * Content of a {@link ChangedFilesDocument}: a root directory on the user's machine plus the paths (relative to
 * it) that the run changed. The renderer builds a file tree from `paths` and, per node, an "open in Zed"
 * command (`<hostRoot>/<path>`), an "open in VS Code" link and — for files — an "open in the file explorer"
 * action.
 *
 * @public
 */
export const ChangedFilesSchema = z
  .object({
    /** Absolute path of the changed tree's root on the user's machine; joined with each path for the IDE links. */
    hostRoot: z.string(),
    /** Paths relative to `hostRoot` that changed (e.g. a git working tree's modified and untracked files). */
    paths: z.array(z.string()),
  })
  .strict();

/**
 * A per-run "changed files" review artifact surfaced in the Studio Handoff panel: the tree of files the run
 * edited, each openable in a local IDE (Zed, VS Code) or the in-Studio file explorer. Tagged {@link HANDOFF_TAG}
 * so it shows in the panel; rendered by the `changed-files` widget. Save it under a stable key and re-save it so
 * the card reflects the latest state.
 *
 * @public
 */
@Document({
  name: 'changed_files',
  tags: [HANDOFF_TAG],
  schema: ChangedFilesSchema,
  widget: { widget: 'changed-files' },
})
export class ChangedFilesDocument {
  hostRoot!: string;
  paths!: string[];
}
