import { Loader2 } from 'lucide-react';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface, MimeType, TransitionPayloadInterface } from '@loopstack/contracts/types';
import Form from '@/components/dynamic-form/Form.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useRunWorkflow } from '@/hooks/useProcessor.ts';

interface FormAction {
  type: string;
  transition?: string;
  label?: string;
  variant?: string;
  props?: Record<string, unknown>;
}

interface FormWidgetOptions {
  properties?: Record<string, unknown>;
  order?: string[];
  title?: string;
  description?: string;
  disabled?: boolean;
  actions?: FormAction[];
}

/** Extract form widget options from ui.widgets[] or legacy ui.form/ui.actions */
function resolveFormConfig(ui: Record<string, unknown> | undefined): {
  formUi: Record<string, unknown> | undefined;
  actions: FormAction[];
} {
  const typed = ui;

  // New format: ui.widgets[{ widget: 'form', options: { properties, actions, ... } }]
  const widgets = typed?.widgets as { widget: string; options?: FormWidgetOptions }[] | undefined;
  const formWidget = widgets?.find((w) => w.widget === 'form');
  if (formWidget?.options) {
    const opts = formWidget.options;
    // Construct the UI object that the Form component expects: { form: { properties, order, ... } }
    const formUi = {
      form: {
        properties: opts.properties,
        order: opts.order,
        title: opts.title,
        description: opts.description,
        disabled: opts.disabled,
      },
    };
    return { formUi, actions: opts.actions ?? [] };
  }

  // Legacy fallback: ui.form + ui.actions
  const legacyActions = (typed?.actions as { options?: { transition?: string; label?: string } }[] | undefined) ?? [];
  return {
    formUi: ui,
    actions: legacyActions.map((a) => ({
      type: 'button',
      transition: a.options?.transition,
      label: a.options?.label,
    })),
  };
}

interface DocumentFormRendererProps {
  parentWorkflow: WorkflowFullInterface;
  workflow: WorkflowFullInterface;
  document: DocumentItemInterface;
  enabled: boolean;
  viewOnly: boolean;
}

const DocumentFormRenderer: React.FC<DocumentFormRendererProps> = ({
  parentWorkflow,
  workflow,
  document,
  enabled,
  viewOnly,
}) => {
  const runWorkflow = useRunWorkflow();

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

  const availableTransitions = workflow.availableTransitions?.map((transition) => transition.id) ?? [];

  const executeWorkflowRun = (transition: string, payload: unknown) => {
    if (!availableTransitions.includes(transition)) {
      console.error(`Transition ${transition} not available.`);
      return;
    }

    runWorkflow.mutate({
      workflowId: parentWorkflow.id,
      runWorkflowPayloadDto: {
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
      executeWorkflowRun(transition, data);
    } else {
      executeWorkflowRun(transition, data.raw);
    }
  };

  const handleActionClick = (action: FormAction) => {
    if (!action.transition) return;
    void form.handleSubmit(
      (data) => handleFormSubmit(action.transition!)(data),
      (errors) => console.error('[DocumentFormRenderer] validation failed', errors),
    )();
  };

  const { formUi, actions } = resolveFormConfig(document.ui);
  const schema = document.schema;
  const formDisabled = !!(formUi?.form as { disabled?: boolean } | undefined)?.disabled;
  const disabledProps = !enabled || formDisabled || false;

  return (
    <div className="flex">
      <Form
        form={form}
        schema={schema}
        ui={formUi ?? undefined}
        mimeType={(document.meta as { mimeType?: MimeType } | undefined)?.mimeType}
        disabled={disabledProps}
        viewOnly={viewOnly}
        actions={
          !viewOnly && actions.length > 0 ? (
            <div className="flex w-full flex-col items-end gap-4">
              {actions.map((action, index) => {
                const isDisabled =
                  disabledProps ||
                  (action.transition !== undefined && !availableTransitions.includes(action.transition));

                return (
                  <Button
                    key={index}
                    type="button"
                    variant={(action.variant as 'default' | 'outline' | 'destructive') ?? 'default'}
                    disabled={isDisabled || runWorkflow.isPending}
                    onClick={() => handleActionClick(action)}
                    className={action.type === 'button-full-w' ? 'w-full' : 'w-48'}
                    {...(action.props ?? {})}
                  >
                    {runWorkflow.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {action.label ?? 'Submit'}
                  </Button>
                );
              })}
            </div>
          ) : undefined
        }
      />
    </div>
  );
};

export default DocumentFormRenderer;
