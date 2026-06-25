// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type DocumentClass<T = any> = Function & { new (...args: any[]): T; prototype: T };

export interface DocumentSaveOptions {
  /**
   * Stable upsert key. Saving twice with the same `key` invalidates the previous row in place,
   * so the document keeps its position in the workflow's document list. Use this for documents
   * that update over time (status tickers, form state, transcripts, structured-output drafts).
   * If omitted, a random UUID is generated and the document is appended.
   */
  key?: string;
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
