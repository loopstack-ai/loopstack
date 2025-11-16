import React from 'react';
import type { TransitionPayloadInterface, WorkflowTransitionType } from '@loopstack/shared';
import { useRunPipeline } from '../../../../hooks/useProcessor.ts';
import type { DocumentItemDto, PipelineDto, WorkflowDto } from '@loopstack/api-client';
import Form from '../../../../components/dynamic-form/Form.tsx';

interface DocumentFormRendererProps {
  pipeline: PipelineDto;
  workflow: WorkflowDto;
  document: DocumentItemDto;
  enabled: boolean;
  viewOnly: boolean;
}

const DocumentFormRenderer: React.FC<DocumentFormRendererProps> = ({
  pipeline,
  workflow,
  document,
  enabled,
  viewOnly
}) => {
  const runPipeline = useRunPipeline();

  const enabledTransitions = (workflow.availableTransitions as any).map(
    (transition: WorkflowTransitionType) => transition.id
  );

  const handleFormSubmit = (payload: any, transition: string) => {
    if (!enabledTransitions.includes(transition)) {
      console.error(`Transition ${transition} not available.`);
      return;
    }

    runPipeline.mutate({
      pipelineId: pipeline.id,
      runPipelinePayloadDto: {
        transition: {
          id: transition,
          workflowId: workflow.id,
          payload: payload
          // meta?: any;
        } as TransitionPayloadInterface
      }
    });
  };

  return (
    <div className="flex">
      <Form
        document={document}
        onSubmit={handleFormSubmit}
        disabled={!enabled}
        viewOnly={viewOnly}
        enabledTransitions={enabledTransitions}
      />
    </div>
  );
};

export default DocumentFormRenderer;
