import type { LoopstackClient } from '@loopstack/client';
import type { DocumentItemInterface, WorkflowFullInterface } from '@loopstack/contracts/api';
import { SortOrder, WorkflowState } from '@loopstack/contracts/enums';

/** First widget of a document's UI config — where prompt type and transition live. */
export interface WidgetConfig {
  widget: string;
  options?: Record<string, unknown>;
}

/** Widgets the terminal can answer. Everything else falls back to the transition picker. */
const PROMPT_WIDGETS = new Set(['text-prompt', 'confirm-prompt', 'choices', 'form']);

/** documentName → widget config, from the same app config Studio's renderers use. */
export async function fetchDocumentWidgets(client: LoopstackClient): Promise<Map<string, WidgetConfig>> {
  const apps = await client.config.apps();
  const widgets = new Map<string, WidgetConfig>();
  for (const app of apps) {
    for (const document of app.documents ?? []) {
      const widget = document.ui?.widgets?.[0] as WidgetConfig | undefined;
      if (widget) widgets.set(document.documentName, widget);
    }
  }
  return widgets;
}

export interface ActivePrompt {
  /** The waiting workflow owning the prompt — transitions are answered against it. */
  workflow: WorkflowFullInterface;
  /** The unanswered prompt document; absent → offer the raw transition picker. */
  document?: DocumentItemInterface;
  widget?: WidgetConfig;
}

/**
 * Finds the prompt a paused run is waiting on. HITL prompts often live on a
 * sub-workflow (e.g. AskUserWorkflow), so the run tree is searched
 * breadth-first for a waiting workflow with an unanswered prompt document.
 */
export async function findActivePrompt(
  client: LoopstackClient,
  rootWorkflowId: string,
  widgets: Map<string, WidgetConfig>,
): Promise<ActivePrompt | undefined> {
  const queue = [rootWorkflowId];
  const visited = new Set<string>();
  // Idle workflow without a renderable document — offered as the transition
  // picker only when no descendant carries a real prompt (the root often just
  // holds a link document pointing at the sub-workflow that asks).
  let fallback: ActivePrompt | undefined;

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const workflow = await client.workflows.get(id);
    const isIdle = workflow.status === WorkflowState.Waiting || workflow.status === WorkflowState.Paused;

    if (isIdle && workflow.availableTransitions?.length) {
      const page = await client.documents.list({
        filter: { workflowId: id, isInvalidated: false },
        sortBy: [{ field: 'index', order: SortOrder.DESC }],
        limit: 10,
      });
      const prompt = page.data.find((document) => {
        const widget = widgets.get(document.documentName);
        if (!widget || !PROMPT_WIDGETS.has(widget.widget)) return false;
        const content = document.content as { answer?: unknown } | null;
        return !content || content.answer === undefined;
      });
      if (prompt) {
        return { workflow, document: prompt, widget: widgets.get(prompt.documentName) };
      }
      fallback ??= { workflow };
    }

    const children = await client.workflows.list({ filter: { parentId: id } });
    queue.push(...children.data.map((child) => child.id));
  }

  return fallback;
}
