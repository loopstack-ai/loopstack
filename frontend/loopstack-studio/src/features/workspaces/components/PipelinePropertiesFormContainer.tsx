import React from 'react';
import { useForm } from 'react-hook-form';
import type { JSONSchemaConfigType, UiFormType, UiWidgetType } from '@loopstack/contracts/types';
import Form from '@/components/dynamic-form/Form.tsx';
import UiActions from '@/components/ui-widgets/UiActions.tsx';

interface PipelinePropertiesFormContainerProps {
  schema: JSONSchemaConfigType;
  ui?: UiFormType;
  availableTransitions: string[];
  onSubmit: (transition: string, data: Record<string, any>) => void;
  defaultValues: Record<string, any>;
  isLoading?: boolean;
}

const PipelinePropertiesFormContainer: React.FC<PipelinePropertiesFormContainerProps> = ({
  schema,
  ui,
  defaultValues,
  availableTransitions,
  onSubmit,
  isLoading,
}) => {
  const form = useForm<Record<string, any>>({
    defaultValues: defaultValues ?? {},
    mode: 'onChange',
  });

  const handleFormSubmit = (transition: string) => (data: Record<string, any>) => {
    onSubmit(transition, data);
  };

  const handleSubmit = (transition: string) => {
    // use data from react-hook-form
    form.handleSubmit(handleFormSubmit(transition));
  };

  const uiActions = [
    {
      type: 'button',
      widget: 'button-full-w',
      transition: '',
      options: {
        label: 'Run Now',
      },
    } satisfies UiWidgetType,
  ];

  return (
    <>
      <Form
        form={form}
        schema={schema}
        ui={ui}
        disabled={false}
        viewOnly={false}
        actions={
          <UiActions
            actions={uiActions}
            onSubmit={handleSubmit}
            availableTransitions={availableTransitions}
            disabled={false}
            isLoading={isLoading}
          />
        }
      />
    </>
  );
};

export default PipelinePropertiesFormContainer;
