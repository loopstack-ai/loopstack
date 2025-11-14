import React from 'react';
import { SubmitButton } from './SubmitButton';
import { ChatInput } from './ChatInput.tsx';
import type { UIFormButtonType } from '@loopstack/shared';

export interface FormButtonsProps {
  handleButtonClick: (transition: string) => (data: Record<string, any>) => void;
  disabled: boolean;
  viewOnly: boolean;
  enabledTransitions: string[];
  buttons: UIFormButtonType[];
  form: any;
}

const FormButtons: React.FC<FormButtonsProps> = ({
  handleButtonClick,
  disabled,
  viewOnly,
  enabledTransitions,
  buttons,
  form
}) => {
  const renderButton = (options: UIFormButtonType) => {
    const widget = options.widget ?? 'button';
    switch (widget) {
      case 'chat':
        return (
          <ChatInput
            key={`form-button-${options.transition}`}
            uiOptions={options}
            disabled={disabled || !enabledTransitions.includes(options.transition)}
            onClick={handleButtonClick(options.transition)}
          />
        );
      default:
        return (
          <SubmitButton
            key={`form-button-${options.transition}`}
            uiOptions={options}
            disabled={disabled || !enabledTransitions.includes(options.transition)}
            onClick={form.handleSubmit(handleButtonClick(options.transition))}
          />
        );
    }
  };

  return viewOnly ? (
    <></>
  ) : (
    <div className="mt-4 w-full flex justify-end">
      {buttons.map((options: UIFormButtonType) => renderButton(options))}
    </div>
  );
};

export default FormButtons;
