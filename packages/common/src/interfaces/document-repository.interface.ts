// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type DocumentClass<T = any> = Function & { new (...args: any[]): T; prototype: T };

export interface DocumentSaveOptions {
  /**
   * Stable revision key. Saving again with the same `key` writes a new revision and invalidates the
   * previous ones, so only the latest is live. Where the new revision sits is set by `position`.
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
   * Free-form extension data stored on the document's `meta` JSONB column. Use for ad-hoc
   * payload that document renderers or downstream readers need (e.g. provider-specific
   * fields on an LLM message). Do not use for framework concerns — those live on the
   * `@Document` decorator (e.g. `internal: true`).
   */
  meta?: Record<string, unknown>;
  /**
   * Schema validation mode for the saved content.
   * - `strict` (default): throws `SchemaValidationError` on validation failure; the transition rolls back.
   * - `safe`: stores the parsed value plus a Zod error on the document, no throw.
   * - `skip`: no validation; raw content stored as-is.
   */
  validate?: 'strict' | 'safe' | 'skip';
}
