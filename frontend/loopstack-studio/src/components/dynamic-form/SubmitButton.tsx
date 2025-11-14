import React from 'react';
import { Button } from '../ui/button';
import type { UIFormButtonType } from '@loopstack/shared';

interface SubmitButtonProps {
  uiOptions?: UIFormButtonType;
  disabled: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ uiOptions, disabled, onClick }) => {
  const submitButtonText = uiOptions?.label || uiOptions?.transition || 'Submit';
  const submitButtonProps = uiOptions?.props || {};

  return (
    <Button
      variant="default"
      {...submitButtonProps}
      disabled={disabled}
      onClick={onClick}
      size={'default'}
      className="w-48"
    >
      {submitButtonText}
    </Button>
  );
};
