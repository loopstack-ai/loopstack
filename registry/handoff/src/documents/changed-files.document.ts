import { z } from 'zod';
import { Document } from '@loopstack/common';

/**
 * One action on each node of a {@link ChangedFilesDocument} tree: a command to copy or a URL to open. In both,
 * `{path}` stands for the node's absolute path on the user's machine (`<hostRoot>/<path>`); in a URL it is
 * URI-encoded.
 *
 * @public
 */
export const ChangedFilesActionSchema = z.union([
  z
    .object({
      /** Tooltip of the action (e.g. "Copy 'zed' command"). */
      label: z.string(),
      /** The command to copy, e.g. `zed "{path}"`. */
      command: z.string(),
    })
    .strict(),
  z
    .object({
      /** Tooltip of the action (e.g. "Open in VS Code"). */
      label: z.string(),
      /** The URL to open, e.g. `vscode://file{path}`. */
      url: z.string(),
    })
    .strict(),
]);

/** @public */
export type ChangedFilesAction = z.infer<typeof ChangedFilesActionSchema>;

/**
 * Content of a {@link ChangedFilesDocument}: a root directory on the user's machine, the paths (relative to
 * it) that the run changed, and the actions each node of the tree offers.
 *
 * @public
 */
export const ChangedFilesSchema = z
  .object({
    /** Absolute path of the changed tree's root on the user's machine; joined with each path for `{path}`. */
    hostRoot: z.string(),
    /** Paths relative to `hostRoot` that changed (e.g. a git working tree's modified and untracked files). */
    paths: z.array(z.string()),
    /** The actions on every file and folder of the tree, in order. */
    actions: z.array(ChangedFilesActionSchema).optional(),
  })
  .strict();

/**
 * A "changed files" review card in the run timeline: the tree of files the run edited, each with the actions
 * the emitting workflow chose (open in an editor, copy a command, …). Studio adds an "open in the file
 * explorer" action to every file. Rendered by the `changed-files` widget. Save it under a stable key and
 * re-save it so the card reflects the latest state.
 *
 * @public
 */
@Document({
  name: 'changed_files',
  schema: ChangedFilesSchema,
  widget: { widget: 'changed-files' },
})
export class ChangedFilesDocument {
  hostRoot!: string;
  paths!: string[];
  actions?: ChangedFilesAction[];
}
