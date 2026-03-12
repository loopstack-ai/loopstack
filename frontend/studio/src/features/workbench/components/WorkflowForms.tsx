import React from 'react';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { WorkflowInterface } from '@loopstack/contracts/types';
import type { UiWidgetType } from '@loopstack/contracts/types';
import UiActions from '@/components/ui-widgets/UiActions.tsx';

interface WorkflowFormsProps {
  workflow: WorkflowInterface;
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
    <div>
      <UiActions
        actions={actions as UiWidgetType[]}
        availableTransitions={availableTransitions}
        currentPlace={workflow.place}
        disabled={workflow.status === WorkflowState.Completed}
        onSubmit={onSubmit}
      />
    </div>
  );
};

export default WorkflowForms;
