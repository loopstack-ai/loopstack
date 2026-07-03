import { useCallback } from 'react';
import type { StudioDocumentConfig, WorkflowFullInterface } from '@loopstack/contracts/api';
import type { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { useRunWorkflow } from '@/hooks/useProcessor.ts';

/**
 * Resolve transition ID from document UI config.
 * Format: ui.widgets[0].options.transition
 */
function resolveTransition(ui: StudioDocumentConfig['ui'] | undefined): string | undefined {
  const widgets = ui?.widgets as { options?: { transition?: string } }[] | undefined;
  if (widgets?.[0]?.options?.transition) {
    return widgets[0].options.transition;
  }
  return undefined;
}

/**
 * Shared hook for document renderers that need to trigger workflow transitions.
 * Extracts the transition ID from the document config's widget options and provides a submit helper.
 */
export function useDocumentTransition(
  parentWorkflow: WorkflowFullInterface,
  workflow: WorkflowFullInterface,
  docConfig: StudioDocumentConfig | undefined,
) {
  const runWorkflow = useRunWorkflow();
  const availableTransitions = workflow.availableTransitions?.map((t) => t.id) ?? [];

  const transitionId = resolveTransition(docConfig?.ui);
  const canSubmit = !!transitionId && availableTransitions.includes(transitionId);

  const submit = useCallback(
    (payload: unknown) => {
      if (!transitionId || !canSubmit) return;
      runWorkflow.mutate({
        workflowId: parentWorkflow.id,
        payload: {
          transition: {
            id: transitionId,
            workflowId: workflow.id,
            payload,
          } as TransitionPayloadInterface,
        },
      });
    },
    [transitionId, canSubmit, runWorkflow, parentWorkflow.id, workflow.id],
  );

  return { submit, canSubmit, isLoading: runWorkflow.isPending };
}
