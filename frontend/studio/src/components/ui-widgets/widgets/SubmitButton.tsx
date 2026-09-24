import { Loader2 } from 'lucide-react';
import React from 'react';
import type { UiFormButtonOptionsType } from '@loopstack/contracts/types';
import { Button } from '../../ui/button.tsx';

interface SubmitButtonProps {
  ui?: UiFormButtonOptionsType;
  disabled: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ ui, disabled, onClick, isLoading }) => {
  const submitButtonText = ui?.label || 'Submit';
  const submitButtonProps = ui?.props || {};
  // Honoured the same way a form action's is: a widget button that is not the primary action has to be
  // able to say so, and `variant` is already part of the options it is given.
  const variant = (ui?.variant as React.ComponentProps<typeof Button>['variant']) ?? 'default';

  return (
    <Button
      type="button"
      variant={variant}
      {...submitButtonProps}
      disabled={disabled || isLoading}
      onClick={() => onClick()}
      size={'default'}
      className="w-48"
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {submitButtonText}
    </Button>
  );
};
