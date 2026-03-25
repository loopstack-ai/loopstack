import React from 'react';
import type { UiFormButtonOptionsType, UiWidgetType } from '@loopstack/contracts/types';
import AiPromptInput from '@/components/ui-widgets/widgets/AiPromptInput';
import { ButtonFullWidth } from '@/components/ui-widgets/widgets/ButtonFullWidth.tsx';
import { SandboxRun } from '@/components/ui-widgets/widgets/SandboxRun.tsx';
import { SecretInput } from '@/components/ui-widgets/widgets/SecretInput.tsx';
import { SubmitButton } from './widgets/SubmitButton';

export interface UiWidgetProps {
  config: UiWidgetType;
  onSubmit: (data?: Record<string, unknown> | string) => void;
  disabled: boolean;
  isLoading?: boolean;
}

const UiWidget: React.FC<UiWidgetProps> = ({ config, onSubmit, disabled, isLoading }) => {
  const options = config.options as Record<string, unknown> | undefined;

  switch (config.widget) {
    case 'prompt-input':
      return <AiPromptInput disabled={disabled} onSubmit={onSubmit} ui={options} />;
    case 'button':
      return (
        <SubmitButton
          ui={options as UiFormButtonOptionsType}
          disabled={disabled}
          onClick={onSubmit}
          isLoading={isLoading}
        />
      );
    case 'button-full-w':
      return (
        <ButtonFullWidth
          ui={options as UiFormButtonOptionsType}
          disabled={disabled}
          onClick={onSubmit}
          isLoading={isLoading}
        />
      );
    case 'sandbox-run':
      return <SandboxRun ui={options as { slotId?: string; label?: string }} disabled={disabled} />;
    case 'secret-input':
      return <SecretInput ui={options as { transition?: string }} disabled={disabled} onSubmit={onSubmit} />;
  }

  return <></>;
};

export default UiWidget;
