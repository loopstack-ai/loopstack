import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { StudioDocumentConfig, WorkflowFullInterface } from '@loopstack/contracts/api';
import {
  type ParkView,
  type ParkViewDocumentInput,
  type ParkViewWidgetConfig,
  type ParkViewWorkflowInput,
  type PromptCandidate,
  evaluateWorkflowPrompts,
  isAnswered,
  pickPrompt,
  toParkView,
} from '@loopstack/contracts/park-view';
import { useLoopstackClient } from '@loopstack/react';
import { useDocumentConfigs } from '@/hooks/useConfig';
import { promptRegistry } from './prompts/registry.tsx';
import type { RunTreeNode } from './useRunTree.ts';

export interface RunPrompts {
  /** The one prompt the run view shows — the same pick the CLI would make. */
  picked?: { candidate: PromptCandidate; view: ParkView };
  /** An active prompt whose widget the run view has no component for (inert card). */
  blocked?: { candidate: PromptCandidate; view: ParkView };
  /** Bare wait — the tree is parked but nothing is renderable. */
  fallback?: { candidate: PromptCandidate; view: ParkView };
  /** Per-document answered verdicts (presence semantics) for transcript rendering. */
  answered: (document: { content: unknown }) => boolean;
  /**
   * `sandbox-run` widgets visible at their workflow's current place. Not prompts — they
   * declare no transition and answer nothing; they open a preview environment (auxiliary
   * control, workbench-hosted only).
   */
  sandboxSlots: { slotId?: string; label?: string }[];
}

interface UiWidgetLike {
  widget: string;
  options?: Record<string, unknown>;
  enabledWhen?: string[];
  showWhen?: string[];
}

/** StudioDocumentConfig → the engine's flattened widget-config shape (the facade's mapping). */
export function toWidgetConfig(config: StudioDocumentConfig): ParkViewWidgetConfig | undefined {
  const widget = (config.ui as { widgets?: UiWidgetLike[] } | undefined)?.widgets?.[0];
  if (!widget) return undefined;
  const meta = config.meta as { enableAtPlaces?: string[]; hideAtPlaces?: string[] } | undefined;
  return {
    widget: widget.widget,
    options: widget.options,
    enabledWhen: widget.enabledWhen,
    showWhen: widget.showWhen,
    schema: config.schema as Record<string, unknown> | undefined,
    enableAtPlaces: meta?.enableAtPlaces,
    hideAtPlaces: meta?.hideAtPlaces,
    internal: config.tags?.includes('internal') || undefined,
  };
}

function toWorkflowInput(workflow: WorkflowFullInterface): ParkViewWorkflowInput {
  return {
    id: workflow.id,
    workflowName: workflow.workflowName,
    status: workflow.status,
    place: workflow.place ?? null,
    availableTransitions: workflow.availableTransitions?.map((transition) => transition.id) ?? [],
  };
}

/**
 * The canonical prompt evaluation over the run tree — the same rules and the same pick
 * `TestRun.parkView()` and the CLI run on. Eligibility is the run view's own prompt
 * registry (per-surface concern, exactly like the CLI's collect registry).
 */
export function useRunPrompts(nodes: RunTreeNode[]): RunPrompts {
  const client = useLoopstackClient();
  const documentConfigs = useDocumentConfigs();

  const docConfigs = useMemo(() => {
    const map = new Map<string, ParkViewWidgetConfig>();
    for (const [name, config] of documentConfigs) {
      const mapped = toWidgetConfig(config);
      if (mapped) map.set(name, mapped);
    }
    return map;
  }, [documentConfigs]);

  // Workflow-level widgets (chat inputs, buttons) come from each workflow's config.
  const workflowNames = useMemo(() => [...new Set(nodes.map((node) => node.workflow.workflowName))], [nodes]);
  const configResults = useQueries({
    queries: workflowNames.map((name) => ({ ...client.queries.workflowConfig(name), staleTime: 60_000 })),
  });
  const workflowWidgets = useMemo(() => {
    const map = new Map<string, ParkViewWidgetConfig[]>();
    workflowNames.forEach((name, index) => {
      const widgets = (configResults[index]?.data?.ui as { widgets?: UiWidgetLike[] } | undefined)?.widgets ?? [];
      map.set(
        name,
        widgets.map((widget) => ({
          widget: widget.widget,
          options: widget.options,
          enabledWhen: widget.enabledWhen,
          showWhen: widget.showWhen,
        })),
      );
    });
    return map;
  }, [workflowNames, ...configResults.map((result) => result.data)]);

  return useMemo(() => {
    const candidates = nodes.flatMap((node) => {
      const documents: ParkViewDocumentInput[] = node.documents
        .filter((document) => !document.isInvalidated)
        .map((document) => ({
          documentName: document.documentName,
          place: document.place ?? null,
          content: (document.content ?? null) as Record<string, unknown> | null,
          tags: (document as { tags?: string[] }).tags,
        }));
      return evaluateWorkflowPrompts(
        toWorkflowInput(node.workflow),
        documents,
        docConfigs,
        workflowWidgets.get(node.workflow.workflowName) ?? [],
      );
    });

    const picked = pickPrompt(
      candidates,
      (candidate) => !!candidate.widget && promptRegistry.has(candidate.widget.widget),
    );
    const withView = (candidate: PromptCandidate | undefined) =>
      candidate ? { candidate, view: toParkView(candidate) } : undefined;

    const sandboxSlots = new Map<string, { slotId?: string; label?: string }>();
    for (const node of nodes) {
      if (node.workflow.status === 'completed') continue;
      for (const widget of workflowWidgets.get(node.workflow.workflowName) ?? []) {
        if (widget.widget !== 'sandbox-run') continue;
        if (widget.showWhen && !widget.showWhen.includes(node.workflow.place ?? '')) continue;
        const options = widget.options as { slotId?: string; label?: string } | undefined;
        sandboxSlots.set(options?.slotId ?? '', { slotId: options?.slotId, label: options?.label });
      }
    }

    return {
      picked: withView(picked.prompt),
      blocked: withView(picked.blocked),
      fallback: withView(picked.fallback),
      answered: (document) => isAnswered(document.content as Record<string, unknown> | null),
      sandboxSlots: [...sandboxSlots.values()],
    };
  }, [nodes, docConfigs, workflowWidgets]);
}
