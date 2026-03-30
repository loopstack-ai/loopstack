import React from 'react';
import type { PipelineInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { WorkflowInterface } from '@loopstack/contracts/types';
import type { UiWidgetType } from '@loopstack/contracts/types';
import UiActions from '@/components/ui-widgets/UiActions.tsx';
import { usePipelineConfigByName } from '@/hooks/usePipelines.ts';
import { useWorkspace } from '@/hooks/useWorkspaces.ts';

interface WorkflowFormsProps {
  workflow: WorkflowInterface;
  pipeline: PipelineInterface;
  onSubmit: (transition: string, data: Record<string, unknown> | string | undefined) => void;
}

const WorkflowForms: React.FC<WorkflowFormsProps> = ({ workflow, pipeline, onSubmit }) => {
  const fetchWorkspace = useWorkspace(pipeline.workspaceId);
  const workspaceBlockName = fetchWorkspace.data?.blockName;
  const fetchConfig = usePipelineConfigByName(workspaceBlockName, workflow.blockName);

  const uiTyped = fetchConfig.data?.ui as { widgets?: unknown[]; actions?: unknown[] } | undefined;
  // New format: ui.widgets, legacy fallback: ui.actions
  const widgets = uiTyped?.widgets ?? uiTyped?.actions;
  if (!widgets?.length) {
    return null;
  }

  const availableTransitions =
    workflow.availableTransitions?.map((transition) => (transition as { id: string }).id) ?? [];

  return (
    <div>
      <UiActions
        actions={widgets as UiWidgetType[]}
        availableTransitions={availableTransitions}
        currentPlace={workflow.place}
        disabled={workflow.status === WorkflowState.Completed}
        onSubmit={onSubmit}
      />
    </div>
  );
};

export default WorkflowForms;
