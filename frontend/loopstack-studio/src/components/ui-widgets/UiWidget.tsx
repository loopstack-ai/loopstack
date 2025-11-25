import React from 'react';
import { SubmitButton } from './widgets/SubmitButton';
import type { UiFormButtonOptionsType, UiWidgetType } from '@loopstack/contracts/types';
import AiPromptInput from '@/components/ui-widgets/widgets/AiPromptInput';
import { ButtonFullWidth } from '@/components/ui-widgets/widgets/ButtonFullWidth.tsx';

export interface UiWidgetProps {
  config: UiWidgetType;
  onSubmit: (data?: Record<string, any>) => void;
  disabled: boolean;
  isLoading?: boolean;
}

const UiWidget: React.FC<UiWidgetProps> = ({
  config,
  onSubmit,
  disabled,
  isLoading,
}) => {

  switch (config.widget) {
    case 'prompt-input':
      return (
        <AiPromptInput
          transition={config.transition}
          disabled={disabled}
          onSubmit={onSubmit}
          ui={config.options}
        />
      );
    case 'button':
      return (
        <SubmitButton
          transition={config.transition}
          ui={config.options as UiFormButtonOptionsType}
          disabled={disabled}
          onClick={onSubmit}
          isLoading={isLoading}
        />
      );
    case 'button-full-w':
      return (
        <ButtonFullWidth
          transition={config.transition}
          ui={config.options as UiFormButtonOptionsType}
          disabled={disabled}
          onClick={onSubmit}
          isLoading={isLoading}
        />
      );
  }

  return <></>;
};

export default UiWidget;
