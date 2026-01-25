import { Loader2 } from 'lucide-react';
import React from 'react';
import type { UiFormButtonOptionsType } from '@loopstack/contracts/types';
import { Button } from '../../ui/button.tsx';

interface SubmitButtonProps {
  transition: string;
  ui?: UiFormButtonOptionsType;
  disabled: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ transition, ui, disabled, onClick, isLoading }) => {
  const submitButtonText = ui?.label || transition;
  const submitButtonProps = ui?.props || {};

  return (
    <Button
      type="button"
      variant="default"
      {...submitButtonProps}
      disabled={disabled || isLoading}
      onClick={onClick}
      size={'default'}
      className="w-48"
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {submitButtonText}
    </Button>
  );
};
