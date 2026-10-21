import type { DynamicDocumentMeta } from '@loopstack/contracts/types';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type DocumentClass<T = any> = Function & { new (...args: any[]): T; prototype: T };

export interface DocumentSaveOptions {
  /**
   * Stable revision key. Saving again with the same `key` writes a new revision and invalidates the
   * previous ones, so only the latest is live. A revision saved with `meta: { invalidate: false }` is
   * the exception: it stays live. Where the new revision sits is set by `position`.
   * If omitted, a random UUID is generated and the document is appended.
   */
  key?: string;
  /**
   * Where a keyed save puts the new revision in the workflow's document list.
   * - `end` (default): appended, like any new document. A revision written after more work has
   *   happened (a decision card shown again after a reply) belongs after that work.
   * - `keep`: in the place of the revision it supersedes. Use this for an entry that changes over
   *   time (status tickers, streamed messages, terminal output, form state, links).
   * Has no effect on the first save under a key.
   */
  position?: 'keep' | 'end';
  /**
   * Per-instance data stored on the document's `meta` JSONB column.
   * - `invalidate: false` keeps this revision live when a later save reuses its `key`. It protects
   *   the revision it is saved with, not earlier ones: a later save still invalidates every earlier
   *   revision under the key that was saved without it.
   * - Any other key is free-form data for document renderers or downstream readers (e.g.
   *   provider-specific fields on an LLM message).
   */
  meta?: DynamicDocumentMeta & Record<string, unknown>;
  /**
   * Schema validation mode for the saved content.
   * - `strict` (default): throws `SchemaValidationError` on validation failure; the transition rolls back.
   * - `safe`: stores the parsed value plus a Zod error on the document, no throw.
   * - `skip`: no validation; raw content stored as-is.
   */
  validate?: 'strict' | 'safe' | 'skip';
}
