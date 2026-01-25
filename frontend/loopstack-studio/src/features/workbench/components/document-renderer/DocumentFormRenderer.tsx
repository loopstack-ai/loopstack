import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { PipelineDto, WorkflowDto } from '@loopstack/api-client';
import type {
  DocumentItemInterface,
  MimeType,
  TransitionPayloadInterface,
  UiWidgetType,
  WorkflowTransitionType,
} from '@loopstack/contracts/types';
import Form from '@/components/dynamic-form/Form.tsx';
import UiActions from '@/components/ui-widgets/UiActions.tsx';
import { useRunPipeline } from '@/hooks/useProcessor.ts';

interface DocumentFormRendererProps {
  pipeline: PipelineDto;
  workflow: WorkflowDto;
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

  const form = useForm<Record<string, unknown>>({
    defaultValues:
      document.schema.type === 'object'
        ? (document.content as Record<string, unknown>)
        : { raw: document.content as unknown },
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
    workflow.availableTransitions?.map((transition) => (transition as WorkflowTransitionType).id) ?? [];

  const executePipelineRun = (transition: string, payload: unknown) => {
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
        } as TransitionPayloadInterface,
      },
    });
  };

  const handleFormSubmit = (transition: string) => (data: Record<string, unknown>) => {
    if (document.schema.type === 'object') {
      executePipelineRun(transition, data);
    } else {
      executePipelineRun(transition, data.raw);
    }
  };

  const handleSubmit = (transition: string) => {
    // use data from react-hook-form
    void form.handleSubmit(handleFormSubmit(transition))();
  };

  const ui = document.ui;
  const schema = document.schema;
  const formDisabled = (ui?.form as { disabled?: boolean } | undefined)?.disabled;
  const disabledProps = !enabled || formDisabled || false;
  const actions: UiWidgetType[] = document.ui?.actions ?? [];

  return (
    <div className="flex">
      <Form
        form={form}
        schema={schema}
        ui={ui ?? undefined}
        mimeType={(document.meta as { mimeType?: MimeType } | undefined)?.mimeType}
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
