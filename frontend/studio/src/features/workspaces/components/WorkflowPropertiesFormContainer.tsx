import React from 'react';
import { useForm } from 'react-hook-form';
import type { JSONSchemaConfigType, UiFormType } from '@loopstack/contracts/types';
import Form from '@/components/dynamic-form/Form.tsx';
import UiActions from '@/components/ui-widgets/UiActions.tsx';

interface WorkflowPropertiesFormContainerProps {
  schema: JSONSchemaConfigType;
  ui?: UiFormType;
  availableTransitions: string[];
  onSubmit: (transition: string, data: Record<string, any>) => void;
  defaultValues: Record<string, any>;
  isLoading?: boolean;
}

const WorkflowPropertiesFormContainer: React.FC<WorkflowPropertiesFormContainerProps> = ({
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
      widget: 'button-full-w',
      options: {
        transition: '',
        label: 'Run Now',
      },
    },
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

export default WorkflowPropertiesFormContainer;
