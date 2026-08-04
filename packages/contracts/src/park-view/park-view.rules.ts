import { WorkflowState } from '../enums/workflow-state.enum.js';
import type {
  ParkView,
  ParkViewDocumentInput,
  ParkViewWidgetConfig,
  ParkViewWorkflowInput,
  ParkWidgetState,
  PickResult,
  PromptCandidate,
} from './park-view.types.js';

/**
 * The transitions a widget config declares — `options.transition` plus every
 * `options.actions[].transition`. The single source of truth for widget-declared
 * transitions across all surfaces.
 *
 * @public
 */
export function declaredTransitions(widget: ParkViewWidgetConfig): string[] {
  const transitions: string[] = [];
  const configured = widget.options?.transition;
  if (typeof configured === 'string') transitions.push(configured);
  const actions = widget.options?.actions;
  if (Array.isArray(actions)) {
    for (const action of actions as { transition?: unknown }[]) {
      if (typeof action.transition === 'string') transitions.push(action.transition);
    }
  }
  return transitions;
}

/**
 * The transition an answer resolves to: the first declared transition that is currently
 * available — or, when the widget declares none, the lone available transition (an
 * undeclared widget is only submittable when the target is unambiguous).
 *
 * @public
 */
export function resolveSubmitTransition(
  widget: ParkViewWidgetConfig,
  availableTransitions: string[],
): string | undefined {
  const declared = declaredTransitions(widget);
  if (declared.length > 0) {
    return declared.find((transition) => availableTransitions.includes(transition));
  }
  return availableTransitions.length === 1 ? availableTransitions[0] : undefined;
}

/**
 * How a widget presents at the current place: `showWhen` hides it entirely outside its
 * places, `enabledWhen` shows it disabled; an unsubmittable widget (no resolvable
 * transition) or a false `statusGate` renders disabled. `statusGate` carries
 * surface-specific status rules (e.g. Studio keeps workflow-level widgets live while the
 * run is running) — pass `true` when no extra gate applies.
 *
 * @public
 */
export function widgetState(
  widget: ParkViewWidgetConfig,
  place: string | null,
  availableTransitions: string[],
  statusGate = true,
): ParkWidgetState {
  if (widget.showWhen && !widget.showWhen.includes(place ?? '')) return 'hidden';
  if (widget.enabledWhen && !widget.enabledWhen.includes(place ?? '')) return 'disabled';
  if (!statusGate) return 'disabled';
  if (resolveSubmitTransition(widget, availableTransitions) === undefined) return 'disabled';
  return 'active';
}

/**
 * Whether a document is visible at the current place: hidden by `meta.hideAtPlaces`,
 * by a document-config `internal` flag, or by an `internal` tag on the instance.
 *
 * @public
 */
export function isDocumentVisible(
  document: ParkViewDocumentInput,
  config: ParkViewWidgetConfig,
  place: string | null,
): boolean {
  if (config.internal) return false;
  if (document.tags?.includes('internal')) return false;
  if (config.hideAtPlaces?.includes(place ?? '')) return false;
  return true;
}

/**
 * Whether a document participates at the current place: saved there (documents are
 * stamped with their transition's target place) or explicitly enabled via
 * `meta.enableAtPlaces`.
 *
 * @public
 */
export function isDocumentActive(
  document: ParkViewDocumentInput,
  config: ParkViewWidgetConfig,
  place: string | null,
): boolean {
  return document.place === place || !!config.enableAtPlaces?.includes(place ?? '');
}

/**
 * Whether a prompt already carries an answer. Presence decides, not truthiness — a
 * recorded `answer: false` (a "No" on a confirm) is an answer.
 *
 * @public
 */
export function isAnswered(content: Record<string, unknown> | null | undefined): boolean {
  return content?.answer !== undefined;
}

/**
 * Whether a workflow's state makes it a prompt source: waiting, paused, or failed (a run
 * parked at an error place offering recovery transitions), always with at least one
 * available transition.
 *
 * @public
 */
export function isAnswerableState(status: string, availableTransitions: string[]): boolean {
  if (availableTransitions.length === 0) return false;
  return (
    status === (WorkflowState.Waiting as string) ||
    status === (WorkflowState.Paused as string) ||
    status === (WorkflowState.Failed as string)
  );
}

/**
 * Evaluates one workflow node into prompt candidates: visible, active, unanswered document
 * prompts (in the given document order), then workflow-level widgets, then the bare-wait
 * fallback. Returns an empty list for non-answerable states.
 *
 * @public
 */
export function evaluateWorkflowPrompts(
  workflow: ParkViewWorkflowInput,
  documents: ParkViewDocumentInput[],
  docConfigs: ReadonlyMap<string, ParkViewWidgetConfig>,
  workflowWidgets: ParkViewWidgetConfig[] = [],
): PromptCandidate[] {
  if (!isAnswerableState(workflow.status, workflow.availableTransitions)) return [];

  const candidates: PromptCandidate[] = [];
  const available = workflow.availableTransitions;

  for (const document of documents) {
    const config = docConfigs.get(document.documentName);
    if (!config) continue;
    if (!isDocumentVisible(document, config, workflow.place)) continue;
    if (!isDocumentActive(document, config, workflow.place)) continue;
    if (isAnswered(document.content)) continue;
    candidates.push({
      kind: 'document',
      workflow,
      document,
      widget: config,
      state: widgetState(config, workflow.place, available),
      submitTransition: resolveSubmitTransition(config, available),
      submitDeclared: declaredTransitions(config).length > 0,
    });
  }

  for (const widget of workflowWidgets) {
    const state = widgetState(widget, workflow.place, available);
    if (state === 'hidden') continue;
    candidates.push({
      kind: 'workflow',
      workflow,
      widget,
      state,
      submitTransition: resolveSubmitTransition(widget, available),
      submitDeclared: declaredTransitions(widget).length > 0,
    });
  }

  candidates.push({
    kind: 'bare',
    workflow,
    state: 'active',
    ...(available.length === 1 && { submitTransition: available[0] }),
  });
  return candidates;
}

/**
 * Selects the prompt a surface would show: the first `active` non-bare candidate passing
 * the surface's eligibility predicate (e.g. the CLI's "a collect implementation exists").
 * `blocked` reports the first rejected candidate with *declared* transitions — explicit
 * config intent is what marks input as submittable on another surface; an undeclared
 * widget rejected here is display-only, not someone else's prompt. `fallback` is the
 * first bare wait — shown only when nothing renderable exists anywhere.
 *
 * @public
 */
export function pickPrompt(
  candidates: PromptCandidate[],
  isEligible: (candidate: PromptCandidate) => boolean = () => true,
): PickResult {
  const result: PickResult = {};
  for (const candidate of candidates) {
    if (candidate.kind === 'bare') {
      result.fallback ??= candidate;
      continue;
    }
    if (candidate.state !== 'active') continue;
    if (isEligible(candidate)) {
      result.prompt = candidate;
      return result;
    }
    if (candidate.submitDeclared) result.blocked ??= candidate;
  }
  return result;
}

/**
 * Assembles the `ParkView` a candidate presents: prompt content, answer schema, widget
 * options, available transitions, the default transition, and the labels of currently
 * submittable form actions.
 *
 * @public
 */
export function toParkView(candidate: PromptCandidate): ParkView {
  const { workflow, document, widget } = candidate;
  const available = workflow.availableTransitions;

  let actions: string[] | undefined;
  const declaredActions = widget?.options?.actions;
  if (Array.isArray(declaredActions)) {
    actions = (declaredActions as { label?: unknown; transition?: unknown }[])
      .filter((action) => typeof action.transition !== 'string' || available.includes(action.transition))
      .map((action) => (typeof action.label === 'string' ? action.label : String(action.transition ?? '')))
      .filter((label) => label.length > 0);
  }

  return {
    workflowId: workflow.id,
    workflowName: workflow.workflowName,
    place: workflow.place,
    status: workflow.status,
    ...(widget && { widget: widget.widget }),
    ...(document && { documentName: document.documentName }),
    ...(document?.content && { content: document.content }),
    ...(widget?.schema && { schema: widget.schema }),
    ...(widget?.options && { options: widget.options }),
    transitions: available,
    ...(candidate.submitTransition && { defaultTransition: candidate.submitTransition }),
    ...(actions?.length && { actions }),
  };
}
