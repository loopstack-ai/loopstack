import { DocumentEntity, StatelessChildRecord, WorkflowMetadataInterface, getBlockConfig } from '@loopstack/common';
import {
  type ParkView,
  type ParkViewDocumentInput,
  type ParkViewWidgetConfig,
  type ParkViewWorkflowInput,
  evaluateWorkflowPrompts,
  pickPrompt,
  toParkView,
} from '@loopstack/contracts/park-view';
import type { StudioDiscoveryService, WorkflowRegistryService } from '@loopstack/core';

interface ParkViewNode {
  workflow: ParkViewWorkflowInput;
  documents: ParkViewDocumentInput[];
  widgets: ParkViewWidgetConfig[];
}

export interface ParkViewData {
  nodes: ParkViewNode[];
  docConfigs: Map<string, ParkViewWidgetConfig>;
}

interface UiWidgetLike {
  widget: string;
  options?: Record<string, unknown>;
  enabledWhen?: string[];
  showWhen?: string[];
}

/**
 * Captures everything `parkView()` needs while the testing module is still open — the
 * rules themselves run lazily on plain data after the module is closed.
 */
export function collectParkViewData(
  meta: WorkflowMetadataInterface,
  rootWorkflowName: string,
  discovery: StudioDiscoveryService,
  registry: WorkflowRegistryService,
): ParkViewData {
  const docConfigs = buildDocConfigMap(discovery);
  const nodes: ParkViewNode[] = [
    {
      workflow: {
        // The root run has no persisted id in stateless mode — '' matches the engine's
        // root-answer payload convention.
        id: '',
        workflowName: rootWorkflowName,
        status: meta.status as string,
        place: meta.place ?? null,
        availableTransitions: meta.availableTransitions.map((t) => t.id),
      },
      documents: mapDocuments(meta.documents),
      widgets: workflowWidgets(registry, rootWorkflowName),
    },
  ];

  // Breadth-first over the inline-executed child records — same order the CLI walks the
  // persisted run tree.
  const queue: StatelessChildRecord[] = [...(meta.statelessState?.children ?? [])];
  while (queue.length > 0) {
    const record = queue.shift()!;
    nodes.push({
      workflow: {
        id: record.workflowId,
        workflowName: record.workflowName,
        status: record.status as string,
        place: record.statelessState?.place ?? null,
        availableTransitions: record.availableTransitions.map((t) => t.id),
      },
      documents: mapDocuments(record.documents),
      widgets: workflowWidgets(registry, record.workflowName),
    });
    queue.push(...(record.statelessState?.children ?? []));
  }

  return { nodes, docConfigs };
}

/**
 * Runs the canonical park-view rules over the captured tree: the prompt the user would
 * see, or the bare-wait fallback (a `ParkView` without `widget`/`documentName`) when the
 * run waits with nothing renderable. `undefined` for terminal runs.
 */
export function computeParkView(data: ParkViewData): ParkView | undefined {
  const candidates = data.nodes.flatMap((node) =>
    evaluateWorkflowPrompts(node.workflow, node.documents, data.docConfigs, node.widgets),
  );
  const { prompt, fallback } = pickPrompt(candidates);
  const winner = prompt ?? fallback;
  return winner ? toParkView(winner) : undefined;
}

/** documentName → flattened widget config, from the same discovery data the config API serves. */
function buildDocConfigMap(discovery: StudioDiscoveryService): Map<string, ParkViewWidgetConfig> {
  const map = new Map<string, ParkViewWidgetConfig>();
  // Documents are global — identical across apps; the first app carries them all.
  const documents = discovery.getApps()[0]?.documents ?? [];
  for (const config of documents) {
    const widget = (config.ui as { widgets?: UiWidgetLike[] } | undefined)?.widgets?.[0];
    if (!widget) continue;
    const meta = config.meta as { enableAtPlaces?: string[]; hideAtPlaces?: string[] } | undefined;
    map.set(config.documentName, {
      widget: widget.widget,
      options: widget.options,
      enabledWhen: widget.enabledWhen,
      showWhen: widget.showWhen,
      schema: config.schema as Record<string, unknown> | undefined,
      enableAtPlaces: meta?.enableAtPlaces,
      hideAtPlaces: meta?.hideAtPlaces,
      internal: config.tags?.includes('internal') || undefined,
    });
  }
  return map;
}

function mapDocuments(documents: DocumentEntity[]): ParkViewDocumentInput[] {
  return documents
    .filter((d) => !d.isInvalidated)
    .map((d) => ({
      documentName: d.documentName,
      place: d.place ?? null,
      content: (d.content ?? null) as Record<string, unknown> | null,
      tags: d.tags ?? undefined,
    }));
}

/** The workflow's own prompt widgets (`@Workflow({ widget })`) — same source the config API serves. */
function workflowWidgets(registry: WorkflowRegistryService, workflowName: string): ParkViewWidgetConfig[] {
  let widgets: UiWidgetLike[];
  try {
    const { instance } = registry.resolve(workflowName);
    widgets = (getBlockConfig(instance) as { ui?: { widgets?: UiWidgetLike[] } } | undefined)?.ui?.widgets ?? [];
  } catch {
    return [];
  }
  return widgets.map((widget) => ({
    widget: widget.widget,
    options: widget.options,
    enabledWhen: widget.enabledWhen,
    showWhen: widget.showWhen,
  }));
}
