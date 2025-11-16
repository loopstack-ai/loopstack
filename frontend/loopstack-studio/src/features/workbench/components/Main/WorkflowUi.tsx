import React from 'react';
import type { WorkflowDto } from '@loopstack/api-client';
import type {
  TransitionMetadataInterface,
  TransitionPayloadInterface,
  UIFormButtonType
} from '@loopstack/shared';
import { ChatInput } from '../../../../components/dynamic-form/ChatInput.tsx';
import { useRunPipeline } from '../../../../hooks/useProcessor.ts';

interface WorkflowUiProps {
  workflow: WorkflowDto;
}

const WorkflowUi: React.FC<WorkflowUiProps> = ({ workflow }) => {
  const runPipeline = useRunPipeline();

  const handleButtonClick = (transition: string) => {
    return (data: Record<string, any>) => {
      runPipeline.mutate({
        pipelineId: workflow.pipelineId,
        runPipelinePayloadDto: {
          transition: {
            id: transition,
            workflowId: workflow.id,
            payload: data.raw
          } as TransitionPayloadInterface
        }
      });
    };
  };

  const renderWidget = (options: UIFormButtonType & { disabled: boolean }) => {
    switch (options.widget) {
      case 'chat':
        return (
          <ChatInput
            key={`form-button-${options.transition}`}
            uiOptions={options}
            disabled={options.disabled}
            onClick={handleButtonClick(options.transition)}
          />
        );
      default:
        return 'unknown';
    }
  };

  return (
    <div className="m-3 mr-5">
      {workflow.ui?.buttons?.map((options: UIFormButtonType) => {
        const availableTransitions = workflow.availableTransitions as TransitionMetadataInterface[];
        //?.map((transition: any) => transition.name) ?? [];
        const disabled =
          (options.enabledWhen && !options.enabledWhen.includes(workflow.place)) ||
          !options.transition ||
          !availableTransitions.find(
            (transition: TransitionMetadataInterface) => transition.id === options.transition
          );
        return renderWidget({ ...options, disabled });
      })}
    </div>
  );
};

export default WorkflowUi;
