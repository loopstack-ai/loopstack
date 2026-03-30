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
  const uiTyped = workflow.ui as { widgets?: unknown[]; actions?: unknown[] } | undefined;
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
