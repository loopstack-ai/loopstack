import { z } from 'zod';

/**
 * Plain-data view of a workflow node fed into the park-view rules.
 * Each surface (testing facade, CLI, Studio) maps its own data source onto this shape.
 *
 * @public
 */
export interface ParkViewWorkflowInput {
  id: string;
  workflowName: string;
  /** A `WorkflowState` value. */
  status: string;
  place: string | null;
  /** Ids of the transitions currently available on this workflow. */
  availableTransitions: string[];
}

/**
 * Plain-data view of a document fed into the park-view rules.
 *
 * @public
 */
export interface ParkViewDocumentInput {
  documentName: string;
  place: string | null;
  content: Record<string, unknown> | null;
  tags?: string[];
}

/**
 * Flattened widget + document-config data the park-view rules evaluate: the first UI widget
 * of a document config (or a workflow-level widget), merged with the document-level
 * visibility settings (`enableAtPlaces`, `hideAtPlaces`, `internal`) and content schema.
 *
 * @public
 */
export interface ParkViewWidgetConfig {
  widget: string;
  options?: Record<string, unknown>;
  /** Places a workflow-level widget is enabled in — outside them it renders disabled. */
  enabledWhen?: string[];
  /** Places a workflow-level widget is shown in — outside them it is hidden entirely. */
  showWhen?: string[];
  /** The document's JSON schema — the shape of the expected answer payload. */
  schema?: Record<string, unknown>;
  /** Extra places the document stays active in (`meta.enableAtPlaces`). */
  enableAtPlaces?: string[];
  /** Places the document is hidden in (`meta.hideAtPlaces`). */
  hideAtPlaces?: string[];
  /** Framework-internal document type — never shown as a prompt. */
  internal?: boolean;
}

/** How a widget presents at the current place: answerable, visible-but-disabled, or not shown. @public */
export type ParkWidgetState = 'active' | 'disabled' | 'hidden';

/**
 * One prompt candidate produced by `evaluateWorkflowPrompts` — a document prompt, a
 * workflow-level widget, or the bare-wait fallback (a parked workflow with transitions
 * but nothing renderable).
 *
 * @public
 */
export interface PromptCandidate {
  kind: 'document' | 'workflow' | 'bare';
  workflow: ParkViewWorkflowInput;
  document?: ParkViewDocumentInput;
  widget?: ParkViewWidgetConfig;
  state: ParkWidgetState;
  /** The transition an answer resolves to (declared∩available, or the lone available one). */
  submitTransition?: string;
  /**
   * Whether the widget explicitly declares transitions. The lone-transition leniency makes
   * undeclared widgets submittable for the surface's own input widgets — but only declared
   * intent marks a candidate as submittable *elsewhere* (`PickResult.blocked`).
   */
  submitDeclared?: boolean;
}

/**
 * Result of `pickPrompt`: the prompt a surface would show, the first candidate blocked by
 * the surface's eligibility predicate (e.g. not collectable by the CLI), and the bare-wait
 * fallback when nothing renderable exists.
 *
 * @public
 */
export interface PickResult {
  prompt?: PromptCandidate;
  blocked?: PromptCandidate;
  fallback?: PromptCandidate;
}

/**
 * What a human would see at a parked run — the canonical answer to "what is this run
 * waiting on". Produced by `toParkView`; consumed by `TestRun.parkView()` assertions and
 * the CLI's pending-prompt surfaces.
 *
 * @public
 */
export const ParkViewSchema = z.object({
  /** The prompting workflow (often a sub-workflow) — answers are submitted against it. */
  workflowId: z.string(),
  workflowName: z.string(),
  place: z.string().nullable(),
  status: z.string(),
  /** Widget type (e.g. 'text-prompt', 'confirm-prompt', 'form') — absent for bare waits. */
  widget: z.string().optional(),
  documentName: z.string().optional(),
  /** The prompt document's content — the question itself. */
  content: z.record(z.string(), z.unknown()).optional(),
  /** The document's JSON schema — the shape of the expected answer payload. */
  schema: z.record(z.string(), z.unknown()).optional(),
  /** Widget options (labels, choices, actions). */
  options: z.record(z.string(), z.unknown()).optional(),
  /** Transition ids currently available on the prompting workflow. */
  transitions: z.array(z.string()),
  /** The transition an answer resolves to when none is given explicitly. */
  defaultTransition: z.string().optional(),
  /** Labels of the currently submittable form actions, when the widget declares actions. */
  actions: z.array(z.string()).optional(),
});

/** @public */
export type ParkView = z.infer<typeof ParkViewSchema>;
