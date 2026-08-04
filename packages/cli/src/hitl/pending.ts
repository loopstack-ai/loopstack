import type { LoopstackClient } from '@loopstack/client';
import { WorkflowState } from '@loopstack/contracts/enums';
import { fetchDocumentWidgets, findActivePrompt } from './discovery.js';
import { describePrompt } from './prompt.js';

/**
 * Machine-readable description of the prompt a run is waiting on — the agent-facing
 * counterpart of the interactive collect widgets: everything needed to render the
 * question elsewhere and answer it with `loopstack answer`.
 */
export interface PendingPromptInfo {
  /** The workflow owning the prompt (often a sub-workflow) — answers are submitted against it. */
  workflowId: string;
  workflowName: string;
  place: string | null;
  /** Human-readable question/summary (same text the interactive prompt shows). */
  description: string;
  /** Wait transitions currently available on the prompting workflow. */
  transitions: string[];
  /** The transition an answer resolves to when none is given explicitly (declared by the widget, or the lone available one). */
  transition?: string;
  /** Widget type (e.g. text-prompt, choices, form) — absent for raw waits. */
  widget?: string;
  /** The prompt document's JSON schema — the shape of the expected answer payload. */
  schema?: Record<string, unknown>;
  /** Widget options (choices, labels, …). */
  options?: Record<string, unknown>;
  /** The prompt document's content (the question itself). */
  content?: Record<string, unknown>;
  /** True when only Studio can collect this input (no CLI support). */
  studioOnly?: boolean;
}

/**
 * Inspects what a run is waiting on. Returns `undefined` when the run is not parked
 * (running or terminal) or no prompt could be found in its tree.
 */
export async function inspectPendingPrompt(
  client: LoopstackClient,
  rootWorkflowId: string,
): Promise<PendingPromptInfo | undefined> {
  const root = await client.workflows.get(rootWorkflowId);
  const parked =
    root.status === WorkflowState.Waiting ||
    root.status === WorkflowState.Paused ||
    root.status === WorkflowState.Failed;
  if (!parked) return undefined;

  const widgets = await fetchDocumentWidgets(client);
  const discovery = await findActivePrompt(client, rootWorkflowId, widgets);

  if (discovery.prompt) {
    const prompt = discovery.prompt;
    const available = prompt.workflow.availableTransitions?.map((transition) => transition.id) ?? [];
    return {
      workflowId: prompt.workflow.id,
      workflowName: prompt.workflow.workflowName,
      place: prompt.workflow.place ?? null,
      description: describePrompt(prompt),
      transitions: available,
      transition: prompt.submitTransition,
      widget: prompt.widget?.widget,
      schema: prompt.widget?.schema,
      options: prompt.widget?.options,
      content: (prompt.document?.content ?? undefined) as Record<string, unknown> | undefined,
    };
  }

  if (discovery.unsupported) {
    const { workflow, widgetName, content } = discovery.unsupported;
    const available = workflow.availableTransitions?.map((transition) => transition.id) ?? [];
    return {
      workflowId: workflow.id,
      workflowName: workflow.workflowName,
      place: workflow.place ?? null,
      description: `input only Studio can collect (${widgetName})`,
      transitions: available,
      widget: widgetName,
      content,
      studioOnly: true,
    };
  }

  return undefined;
}
