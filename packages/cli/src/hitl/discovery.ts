import type { LoopstackClient } from '@loopstack/client';
import type { DocumentItemInterface, WorkflowFullInterface } from '@loopstack/contracts/api';
import { SortOrder, WorkflowState } from '@loopstack/contracts/enums';
import { isCollectable } from '../widgets/registry.js';

/** First widget of a document's UI config — where prompt type and transition live. */
export interface WidgetConfig {
  widget: string;
  options?: Record<string, unknown>;
  /** Places the widget is active in (workflow-level widgets). */
  enabledWhen?: string[];
  /** Alternate spelling used by some widget configs — same semantics. */
  showWhen?: string[];
  /** The document's JSON schema — seeds the $EDITOR payload skeleton for forms. */
  schema?: Record<string, unknown>;
  /**
   * Extra places the document stays active in (`meta.enableAtPlaces` on the
   * document config) — Studio's escape hatch for prompts answered in a later
   * place than they were saved in.
   */
  enableAtPlaces?: string[];
}

/** documentName → widget config, from the same app config Studio's renderers use. */
export async function fetchDocumentWidgets(client: LoopstackClient): Promise<Map<string, WidgetConfig>> {
  const apps = await client.config.apps();
  const widgets = new Map<string, WidgetConfig>();
  for (const app of apps) {
    for (const document of app.documents ?? []) {
      const widget = document.ui?.widgets?.[0] as WidgetConfig | undefined;
      if (widget) {
        const meta = (document as { meta?: { enableAtPlaces?: string[] } }).meta;
        widgets.set(document.documentName, {
          ...widget,
          schema: document.schema as Record<string, unknown> | undefined,
          enableAtPlaces: meta?.enableAtPlaces,
        });
      }
    }
  }
  return widgets;
}

export interface ActivePrompt {
  /** The waiting workflow owning the prompt — transitions are answered against it. */
  workflow: WorkflowFullInterface;
  /** The unanswered prompt document; absent for workflow-level widgets and the raw fallback. */
  document?: DocumentItemInterface;
  widget?: WidgetConfig;
}

/** An active, interactive widget the CLI has no collect implementation for — Studio-only input. */
export interface UnsupportedPrompt {
  workflow: WorkflowFullInterface;
  widgetName: string;
  documentName?: string;
  /** The prompt document's content — feeds the widget's handoff hint. */
  content?: Record<string, unknown>;
}

export interface PromptDiscovery {
  /** The prompt to render — or the raw fallback (no document/widget) when the tree is quiet. */
  prompt?: ActivePrompt;
  /**
   * Input Studio could collect but the CLI cannot (no collect widget).
   * Only reported when no answerable prompt exists anywhere in the tree.
   */
  unsupported?: UnsupportedPrompt;
  /**
   * Workflows below the root that can still move on their own (running —
   * not parked in a wait, not terminal). Only meaningful when no renderable
   * prompt was found: the search returns early on a hit.
   */
  hasActiveDescendants: boolean;
}

const TERMINAL_STATES = new Set([WorkflowState.Completed, WorkflowState.Failed, WorkflowState.Canceled]);
/**
 * Parked states wait for outside input — a parked workflow cannot make
 * progress by itself any more than a waiting root can, so it must not keep
 * the idle poll alive (T20: counting parked subs as active hung the CLI).
 */
const PARKED_STATES = new Set([WorkflowState.Waiting, WorkflowState.Paused]);

/** Transitions a widget config declares (`options.transition` and form `options.actions[].transition`). */
function declaredTransitions(widget: WidgetConfig): string[] {
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

/** Studio's `canSubmit` gate: a declared transition is currently available. */
function isSubmittable(widget: WidgetConfig, available: string[]): boolean {
  return declaredTransitions(widget).some((transition) => available.includes(transition));
}

/**
 * A collectable widget is askable when its declared transition is available —
 * or when it declares none: the collect widget then resolves a lone
 * available transition itself.
 */
function isAskable(widget: WidgetConfig, available: string[]): boolean {
  return declaredTransitions(widget).length === 0 || isSubmittable(widget, available);
}

/**
 * The active documents of a waiting workflow — Studio's `isDocumentActive`:
 * saved at the current place (documents are stamped with their transition's
 * target place), or explicitly enabled here via `meta.enableAtPlaces`.
 */
async function fetchActiveDocuments(
  client: LoopstackClient,
  workflow: WorkflowFullInterface,
  widgets: Map<string, WidgetConfig>,
): Promise<DocumentItemInterface[]> {
  const page = await client.documents.list({
    filter: { workflowId: workflow.id, isInvalidated: false, place: workflow.place },
    sortBy: [{ field: 'index', order: SortOrder.DESC }],
  });
  const active = [...page.data];

  // enableAtPlaces documents live at another place — one extra page, only
  // when the static config actually declares the current place.
  const extraNames = new Set(
    [...widgets.entries()]
      .filter(([, config]) => config.enableAtPlaces?.includes(workflow.place ?? ''))
      .map(([name]) => name),
  );
  if (extraNames.size > 0) {
    const extras = await client.documents.list({
      filter: { workflowId: workflow.id, isInvalidated: false },
      sortBy: [{ field: 'index', order: SortOrder.DESC }],
      limit: 50,
    });
    for (const document of extras.data) {
      if (extraNames.has(document.documentName) && document.place !== workflow.place) {
        active.push(document);
      }
    }
  }
  return active;
}

/**
 * The workflow's own prompt widget (e.g. `prompt-input`), active in the
 * workflow's current place. Cached per workflow name — chat loops rediscover
 * every round.
 */
async function findWorkflowWidget(
  client: LoopstackClient,
  workflow: WorkflowFullInterface,
  cache: Map<string, WidgetConfig[]>,
): Promise<WidgetConfig | undefined> {
  let widgets = cache.get(workflow.workflowName);
  if (!widgets) {
    const config = await client.config.workflowConfig(workflow.workflowName).catch(() => undefined);
    widgets = (config?.ui as { widgets?: WidgetConfig[] } | undefined)?.widgets ?? [];
    cache.set(workflow.workflowName, widgets);
  }
  return widgets.find((widget) => {
    const places = widget.enabledWhen ?? widget.showWhen;
    return !places || places.includes(workflow.place ?? '');
  });
}

/**
 * Finds the prompt a paused run is waiting on. HITL prompts often live on a
 * sub-workflow (e.g. AskUserWorkflow), so the run tree is searched
 * breadth-first for a waiting workflow with an active, interactive widget —
 * Studio's rules (`isDocumentActive` by place, `canSubmit` by transition
 * availability), answerability derived from the widget registry: answerable
 * = a collect implementation exists. Declared-but-unimplemented widgets are
 * reported as `unsupported` (Studio-only input) instead of being mistaken
 * for a still-moving run.
 */
export async function findActivePrompt(
  client: LoopstackClient,
  rootWorkflowId: string,
  widgets: Map<string, WidgetConfig>,
  workflowWidgets: Map<string, WidgetConfig[]> = new Map(),
): Promise<PromptDiscovery> {
  const queue = [rootWorkflowId];
  const visited = new Set<string>();
  // Idle workflow without a renderable document — reported without a widget
  // so callers print the generic waiting line (the root often just holds a
  // link document pointing at the sub-workflow that asks).
  let fallback: ActivePrompt | undefined;
  let unsupported: UnsupportedPrompt | undefined;
  let hasActiveDescendants = false;

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const workflow = await client.workflows.get(id);
    // The place decides what is answerable (Studio's rule): waiting/paused
    // runs and failed runs parked at an error place with transitions (e.g.
    // a Recover button) are both prompt sources.
    const answerable =
      workflow.status === WorkflowState.Waiting ||
      workflow.status === WorkflowState.Paused ||
      workflow.status === WorkflowState.Failed;

    if (id !== rootWorkflowId && !TERMINAL_STATES.has(workflow.status) && !PARKED_STATES.has(workflow.status)) {
      hasActiveDescendants = true;
    }

    if (answerable && workflow.availableTransitions?.length) {
      const available = workflow.availableTransitions.map((transition) => transition.id);
      const documents = await fetchActiveDocuments(client, workflow, widgets).catch(
        () => [] as DocumentItemInterface[],
      );

      for (const document of documents) {
        const widget = widgets.get(document.documentName);
        if (!widget) continue;
        const content = document.content as { answer?: unknown } | null;
        if (content && content.answer !== undefined) continue;

        if (isCollectable(widget.widget)) {
          if (isAskable(widget, available)) {
            return { prompt: { workflow, document, widget }, hasActiveDescendants };
          }
        } else if (isSubmittable(widget, available)) {
          // Studio could submit this (declared transition is available), the
          // CLI can't collect it — display-only widgets never end up here.
          unsupported ??= {
            workflow,
            widgetName: widget.widget,
            documentName: document.documentName,
            content: (document.content ?? undefined) as Record<string, unknown> | undefined,
          };
        }
      }

      // No prompt document — the workflow itself may carry the prompt
      // widget (e.g. the chat input from `@Workflow({ widget })`).
      const workflowWidget = await findWorkflowWidget(client, workflow, workflowWidgets);
      if (workflowWidget) {
        if (isCollectable(workflowWidget.widget)) {
          if (isAskable(workflowWidget, available)) {
            return { prompt: { workflow, widget: workflowWidget }, hasActiveDescendants };
          }
        } else if (isSubmittable(workflowWidget, available)) {
          unsupported ??= { workflow, widgetName: workflowWidget.widget };
        }
      }
      fallback ??= { workflow };
    }

    const children = await client.workflows.list({ filter: { parentId: id } });
    queue.push(...children.data.map((child) => child.id));
  }

  return { prompt: fallback, unsupported, hasActiveDescendants };
}
