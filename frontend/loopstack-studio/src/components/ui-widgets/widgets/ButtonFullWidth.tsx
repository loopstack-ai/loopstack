import React from 'react';
import { Button } from '../../ui/button.tsx';
import type { UiFormButtonOptionsType } from '@loopstack/contracts/types';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps {
  transition: string;
  ui?: UiFormButtonOptionsType;
  disabled: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
}

export const ButtonFullWidth: React.FC<SubmitButtonProps> = ({ transition, ui, disabled, onClick, isLoading }) => {
  const submitButtonText = ui?.label || transition;
  const submitButtonProps = ui?.props || {};

  return (
    <Button
      type='button'
      variant={ui?.variant as any || 'default'}
      {...submitButtonProps}
      disabled={disabled || isLoading}
      onClick={onClick}
      size={'lg'}
      className={'w-full font-medium'}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {submitButtonText}
    </Button>
  );
};
