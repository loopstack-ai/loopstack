import type { LoopstackClient } from '@loopstack/client';
import type { DocumentItemInterface, WorkflowFullInterface } from '@loopstack/contracts/api';
import { SortOrder, WorkflowState } from '@loopstack/contracts/enums';
import {
  type ParkViewDocumentInput,
  type ParkViewWidgetConfig,
  type ParkViewWorkflowInput,
  type PromptCandidate,
  evaluateWorkflowPrompts,
  isAnswerableState,
  pickPrompt,
} from '@loopstack/contracts/park-view';
import { isCollectable } from '../widgets/registry.js';

/**
 * The canonical flattened widget config — prompt type, transitions, schema, and
 * visibility settings. Re-exported so collect widgets and prompt rendering share one type.
 */
export type WidgetConfig = ParkViewWidgetConfig;

/** documentName → widget config, from the same app config Studio's renderers use. */
export async function fetchDocumentWidgets(client: LoopstackClient): Promise<Map<string, WidgetConfig>> {
  const apps = await client.config.apps();
  const widgets = new Map<string, WidgetConfig>();
  for (const app of apps) {
    for (const document of app.documents ?? []) {
      const widget = (document.ui as { widgets?: WidgetConfig[] } | undefined)?.widgets?.[0];
      if (widget) {
        const meta = (document as { meta?: { enableAtPlaces?: string[]; hideAtPlaces?: string[] } }).meta;
        widgets.set(document.documentName, {
          ...widget,
          schema: document.schema as Record<string, unknown> | undefined,
          enableAtPlaces: meta?.enableAtPlaces,
          hideAtPlaces: meta?.hideAtPlaces,
          internal: (document as { tags?: string[] }).tags?.includes('internal') || undefined,
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
  /** The transition an answer resolves to when none is given explicitly. */
  submitTransition?: string;
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

/**
 * The documents of a waiting workflow worth evaluating: those saved at the current place
 * (a server-side fetch optimization — the canonical activity rule re-checks), plus
 * documents another place saved but the static config enables here (`meta.enableAtPlaces`).
 */
async function fetchCandidateDocuments(
  client: LoopstackClient,
  workflow: WorkflowFullInterface,
  widgets: Map<string, WidgetConfig>,
): Promise<DocumentItemInterface[]> {
  const page = await client.documents.list({
    filter: { workflowId: workflow.id, isInvalidated: false, place: workflow.place },
    sortBy: [{ field: 'index', order: SortOrder.DESC }],
  });
  const candidates = [...page.data];

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
        candidates.push(document);
      }
    }
  }
  return candidates;
}

/**
 * The workflow's own prompt widgets (e.g. `prompt-input`), from the workflow config.
 * Cached per workflow name — chat loops rediscover every round. Place gating happens in
 * the canonical rules (`showWhen` hides, `enabledWhen` disables).
 */
async function fetchWorkflowWidgets(
  client: LoopstackClient,
  workflow: WorkflowFullInterface,
  cache: Map<string, WidgetConfig[]>,
): Promise<WidgetConfig[]> {
  let widgets = cache.get(workflow.workflowName);
  if (!widgets) {
    const config = await client.config.workflowConfig(workflow.workflowName).catch(() => undefined);
    widgets = (config?.ui as { widgets?: WidgetConfig[] } | undefined)?.widgets ?? [];
    cache.set(workflow.workflowName, widgets);
  }
  return widgets;
}

/**
 * Finds the prompt a paused run is waiting on. HITL prompts often live on a
 * sub-workflow (e.g. AskUserWorkflow), so the run tree is searched breadth-first for a
 * waiting workflow with an active, interactive widget. Visibility, activity, and
 * submittability come from the canonical park-view rules in `@loopstack/contracts` —
 * the same rules `TestRun.parkView()` asserts against. Answerability stays CLI-local:
 * answerable = a collect implementation exists; declared-but-unimplemented widgets are
 * reported as `unsupported` (Studio-only input) instead of being mistaken for a
 * still-moving run.
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
    if (id !== rootWorkflowId && !TERMINAL_STATES.has(workflow.status) && !PARKED_STATES.has(workflow.status)) {
      hasActiveDescendants = true;
    }

    const workflowInput: ParkViewWorkflowInput = {
      id: workflow.id,
      workflowName: workflow.workflowName,
      status: workflow.status,
      place: workflow.place ?? null,
      availableTransitions: workflow.availableTransitions?.map((transition) => transition.id) ?? [],
    };

    // Only answerable nodes are worth the document/config fetches — the rules would
    // produce no candidates for the rest anyway.
    const answerable = isAnswerableState(workflowInput.status, workflowInput.availableTransitions);
    const documents = answerable
      ? await fetchCandidateDocuments(client, workflow, widgets).catch(() => [] as DocumentItemInterface[])
      : [];
    const documentBySource = new Map<ParkViewDocumentInput, DocumentItemInterface>();
    const documentInputs = documents.map((document) => {
      const input: ParkViewDocumentInput = {
        documentName: document.documentName,
        place: document.place ?? null,
        content: (document.content ?? null) as Record<string, unknown> | null,
        tags: (document as { tags?: string[] }).tags,
      };
      documentBySource.set(input, document);
      return input;
    });

    const candidates = answerable
      ? evaluateWorkflowPrompts(
          workflowInput,
          documentInputs,
          widgets,
          await fetchWorkflowWidgets(client, workflow, workflowWidgets),
        )
      : [];

    const toActivePrompt = (candidate: PromptCandidate): ActivePrompt => ({
      workflow,
      document: candidate.document ? documentBySource.get(candidate.document) : undefined,
      widget: candidate.widget,
      submitTransition: candidate.submitTransition,
    });

    const picked = pickPrompt(candidates, (candidate) => !!candidate.widget && isCollectable(candidate.widget.widget));
    if (picked.prompt) {
      return { prompt: toActivePrompt(picked.prompt), hasActiveDescendants };
    }
    if (picked.blocked?.widget) {
      // Studio could submit this (its transition is available), the CLI can't collect it —
      // display-only widgets never end up here.
      unsupported ??= {
        workflow,
        widgetName: picked.blocked.widget.widget,
        documentName: picked.blocked.document?.documentName,
        content: picked.blocked.document?.content ?? undefined,
      };
    }
    if (picked.fallback) {
      fallback ??= toActivePrompt(picked.fallback);
    }

    const children = await client.workflows.list({ filter: { parentId: id } });
    queue.push(...children.data.map((child) => child.id));
  }

  return { prompt: fallback, unsupported, hasActiveDescendants };
}
