import React from 'react';
import { type WorkflowDto, WorkflowState } from '@loopstack/api-client';
import type { UiWidgetType } from '@loopstack/contracts/types';
import UiActions from '@/components/ui-widgets/UiActions.tsx';

interface WorkflowFormsProps {
  workflow: WorkflowDto;
  onSubmit: (transition: string, data: Record<string, unknown> | string | undefined) => void;
}

const WorkflowForms: React.FC<WorkflowFormsProps> = ({ workflow, onSubmit }) => {
  const actions = (workflow.ui as { actions?: unknown[] } | undefined)?.actions;
  if (!actions?.length) {
    return null;
  }

  const availableTransitions =
    workflow.availableTransitions?.map((transition) => (transition as { id: string }).id) ?? [];

  return (
    <div className="p-4">
      <UiActions
        actions={actions as UiWidgetType[]}
        availableTransitions={availableTransitions}
        disabled={workflow.status === WorkflowState.Completed}
        onSubmit={onSubmit}
      />
    </div>
  );
};

export default WorkflowForms;
