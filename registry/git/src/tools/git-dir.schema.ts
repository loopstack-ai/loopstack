import { z } from 'zod';

/**
 * The `dir` argument every git tool accepts: the repository it addresses, as a path relative to the workspace
 * root. A workspace can hold several repositories in one tree, so each call names the one it works on.
 *
 * @public
 */
export const GitDirArgSchema = z
  .string()
  .optional()
  .describe('Repository path relative to the workspace root. Omit to address the workspace root itself.');

/**
 * Args for the git tools whose only argument is the repository `dir`.
 *
 * @public
 */
export type GitDirArgs = { dir?: string };
