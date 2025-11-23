import React from 'react';
import { Button } from '../../ui/button.tsx';
import type { UiFormButtonOptionsType } from '@loopstack/shared';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps {
  transition: string;
  ui?: UiFormButtonOptionsType;
  disabled: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ transition, ui, disabled, onClick, isLoading }) => {
  const submitButtonText = ui?.label || transition;
  const submitButtonProps = ui?.props || {};

  return (
    <Button
      type='button'
      variant="default"
      {...submitButtonProps}
      disabled={disabled || isLoading}
      onClick={onClick}
      size={'default'}
      className="w-48"
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {submitButtonText}
    </Button>
  );
};
