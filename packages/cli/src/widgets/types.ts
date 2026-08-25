/**
 * The CLI's widget layer, mirroring Studio's renderer registry: a widget can
 * render (transcript output when its document arrives) and/or collect (ask
 * the user for input when it is the active prompt of an idle run). Document
 * widgets bind to documents; workflow widgets (chat input, continue button)
 * bind to the workflow's own UI config. Answerability is derived, not
 * declared: a widget the CLI can answer is one with a `collect`
 * implementation. Kept CLI-internal for now; may become a shared package
 * later.
 */

export interface WidgetContext {
  documentName: string;
  /** The workflow owning the document. */
  workflowId: string;
  /** The widget's UI config (`options` from the document yaml). */
  options?: Record<string, unknown>;
  /** The document's JSON schema — field order and titles (Studio parity). */
  schema?: Record<string, unknown>;
  /** Message ids whose tokens already streamed — their text is on screen. */
  streamedMessageIds?: ReadonlySet<string>;
  /** Tool call ids already rendered live from stream events. */
  streamedToolCallIds?: ReadonlySet<string>;
  /** Studio deep link builder; undefined when no Studio URL is configured. */
  studioUrl?: (workflowId: string) => string | undefined;
}

export interface WidgetOutput {
  /** A paragraph-spaced content block: blank line, then railed lines. */
  block(text: string): void;
  /** An attached line without paragraph spacing (links, tool machinery). */
  line(text: string): void;
}

export type DocumentWidget = (content: Record<string, unknown>, ctx: WidgetContext, out: WidgetOutput) => void;

/** Renders one form field as lines (unindented — the form widget indents). */
export type FieldWidget = (key: string, value: unknown) => string[];

/** The answer a collect widget produces — submitted against the prompting workflow. */
export interface PromptAnswer {
  transitionId: string;
  payload: unknown;
}

/**
 * Minimal HTTP surface for widgets with a server side effect (e.g.
 * `secret-input` storing values via the secrets API). Structurally satisfied
 * by `@loopstack/client`'s `HttpClient`.
 */
export interface CollectHttp {
  get<T = unknown>(path: string): Promise<T>;
  put<T = unknown>(path: string, body?: unknown): Promise<T>;
}

/** Everything a collect widget needs to ask its question. */
export interface CollectContext {
  /** The prompt document's content; `{}` for workflow-level widgets. */
  content: Record<string, unknown>;
  documentName?: string;
  /** The widget's UI config (`options` from the yaml). */
  options?: Record<string, unknown>;
  /** The document's JSON schema — seeds the $EDITOR payload skeleton. */
  schema?: Record<string, unknown>;
  /** Transition ids currently available on the prompting workflow. */
  availableTransitions: string[];
  /** Workspace of the prompting workflow — scope for API side effects. */
  workspaceId?: string;
  /** API access for widgets that persist outside the transition payload. */
  http?: CollectHttp;
}

export interface CollectIo {
  /** Asks one question; rejects with AbortError on closed stdin / signal. */
  ask(query: string): Promise<string>;
  /** Asks without echoing the typed input (credentials — sudo-style). */
  askSecret(query: string): Promise<string>;
  out: NodeJS.WritableStream;
}

/**
 * Collects the user's answer for one widget — the terminal counterpart of a
 * Studio renderer's interactive part. Returns `undefined` when the user
 * declines (empty input on a picker).
 */
export type CollectWidget = (ctx: CollectContext, io: CollectIo) => Promise<PromptAnswer | undefined>;

/** One registry entry: render and/or collect, plus an optional handoff hint. */
export interface CliWidget {
  render?: DocumentWidget;
  collect?: CollectWidget;
  /**
   * For widgets without a collect implementation: a specific instruction for
   * the pause point (e.g. the OAuth sign-in URL), replacing the generic
   * "waiting for input the CLI can't collect" line.
   */
  handoff?: (content: Record<string, unknown>) => string | undefined;
}
