import { useCallback } from 'react';
import type { PipelineInterface } from '@loopstack/contracts/api';
import type { TransitionPayloadInterface, UiFormType, WorkflowInterface } from '@loopstack/contracts/types';
import { useRunPipeline } from '@/hooks/useProcessor.ts';

/**
 * Resolve transition ID from document UI config.
 * New format: ui.widgets[0].options.transition
 * Legacy: ui.actions[0].options.transition
 */
function resolveTransition(ui: UiFormType | undefined): string | undefined {
  const typed = ui as Record<string, unknown> | undefined;

  // New format
  const widgets = typed?.widgets as { options?: { transition?: string } }[] | undefined;
  if (widgets?.[0]?.options?.transition) {
    return widgets[0].options.transition;
  }

  // Legacy fallback
  const actions = typed?.actions as { options?: { transition?: string } }[] | undefined;
  return actions?.map((a) => a.options?.transition).find((t) => !!t);
}

/**
 * Shared hook for document renderers that need to trigger workflow transitions.
 * Extracts the transition ID from widget options and provides a submit helper.
 */
export function useDocumentTransition(
  pipeline: PipelineInterface,
  workflow: WorkflowInterface,
  ui: UiFormType | undefined,
) {
  const runPipeline = useRunPipeline();
  const availableTransitions = workflow.availableTransitions?.map((t) => t.id) ?? [];

  const transitionId = resolveTransition(ui);
  const canSubmit = !!transitionId && availableTransitions.includes(transitionId);

  const submit = useCallback(
    (payload: unknown) => {
      if (!transitionId || !canSubmit) return;
      runPipeline.mutate({
        pipelineId: pipeline.id,
        runPipelinePayloadDto: {
          transition: {
            id: transitionId,
            workflowId: workflow.id,
            payload,
          } as TransitionPayloadInterface,
        },
      });
    },
    [transitionId, canSubmit, runPipeline, pipeline.id, workflow.id],
  );

  return { submit, canSubmit, isLoading: runPipeline.isPending };
}
