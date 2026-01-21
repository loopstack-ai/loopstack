import React from 'react';
import type { WorkflowInterface, WorkflowTransitionType } from '@loopstack/contracts/types';
import UiActions from '@/components/ui-widgets/UiActions.tsx';

interface WorkflowFormsProps {
  workflow: WorkflowInterface;
  onSubmit: (transition: string, data: any) => void;
}

const WorkflowForms: React.FC<WorkflowFormsProps> = ({ workflow, onSubmit }) => {
  if (!workflow.ui?.actions?.length) {
    return null;
  }

  const availableTransitions =
    (workflow.availableTransitions as any)?.map((transition: WorkflowTransitionType) => transition.id) ?? [];

  return (
    <div className="p-4">
      <UiActions
        actions={workflow.ui.actions}
        availableTransitions={availableTransitions}
        disabled={workflow.status === 'completed'}
        onSubmit={onSubmit}
      />
    </div>
  );
};

export default WorkflowForms;
