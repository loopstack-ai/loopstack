import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { PipelineDto } from '@loopstack/api-client';
import type {
  DocumentItemInterface,
  TransitionPayloadInterface,
  UiPropertiesType,
  UiWidgetType,
  WorkflowInterface,
  WorkflowTransitionType,
} from '@loopstack/contracts/types';
import Form from '@/components/dynamic-form/Form.tsx';
import UiActions from '@/components/ui-widgets/UiActions.tsx';
import { useRunPipeline } from '@/hooks/useProcessor.ts';

interface DocumentFormRendererProps {
  pipeline: PipelineDto;
  workflow: WorkflowInterface;
  document: DocumentItemInterface;
  enabled: boolean;
  viewOnly: boolean;
}

const DocumentFormRenderer: React.FC<DocumentFormRendererProps> = ({
  pipeline,
  workflow,
  document,
  enabled,
  viewOnly,
}) => {
  const runPipeline = useRunPipeline();

  const form = useForm<Record<string, any>>({
    defaultValues: document.schema.type === 'object' ? document.content : { raw: document.content },
    mode: 'onChange',
  });

  useEffect(() => {
    if (document.validationError) {
      const error = document.validationError as z.ZodError;
      error.issues.forEach((issue) => {
        const fieldPath = issue.path.join('.');
        form.setError(fieldPath, {
          type: issue.code,
          message: issue.message,
        });
      });
    } else {
      form.clearErrors();
    }
  }, [document.validationError, form]);

  const availableTransitions =
    (workflow.availableTransitions as any)?.map((transition: WorkflowTransitionType) => transition.id) ?? [];

  const executePipelineRun = (transition: string, payload: any) => {
    if (!availableTransitions.includes(transition)) {
      console.error(`Transition ${transition} not available.`);
      return;
    }

    runPipeline.mutate({
      pipelineId: pipeline.id,
      runPipelinePayloadDto: {
        transition: {
          id: transition,
          workflowId: workflow.id,
          payload: payload,
          // meta?: any;
        } as TransitionPayloadInterface,
      },
    });
  };

  const handleFormSubmit = (transition: string) => (data: Record<string, any>) => {
    if (document.schema.type === 'object') {
      executePipelineRun(transition, data);
    } else {
      executePipelineRun(transition, data.raw);
    }
  };

  const handleSubmit = (transition: string) => {
    // use data from react-hook-form
    form.handleSubmit(handleFormSubmit(transition))();
  };

  const ui = document.ui?.form as UiPropertiesType | undefined;
  const schema = document.schema;
  const disabledProps = !enabled || ui?.disabled || false;
  const actions = (document.ui?.actions || []) as UiWidgetType[];

  return (
    <div className="flex">
      <Form
        form={form}
        schema={schema}
        ui={ui}
        mimeType={document.meta?.mimeType}
        disabled={disabledProps}
        viewOnly={viewOnly}
        actions={
          <UiActions
            actions={actions}
            onSubmit={handleSubmit}
            availableTransitions={availableTransitions}
            disabled={disabledProps}
            isLoading={runPipeline.isPending}
          />
        }
      />
    </div>
  );
};

export default DocumentFormRenderer;
