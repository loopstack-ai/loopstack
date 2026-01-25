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

export const ButtonFullWidth: React.FC<SubmitButtonProps> = ({ transition, ui, disabled, onClick, isLoading }) => {
  const submitButtonText = ui?.label ?? transition;
  const submitButtonProps = ui?.props ?? {};
  type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  const variant: ButtonVariant = (ui?.variant as ButtonVariant) ?? 'default';

  return (
    <Button
      type="button"
      variant={variant}
      {...submitButtonProps}
      disabled={disabled || isLoading}
      onClick={onClick}
      size={'lg'}
      className={'w-full font-medium'}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {submitButtonText}
    </Button>
  );
};
