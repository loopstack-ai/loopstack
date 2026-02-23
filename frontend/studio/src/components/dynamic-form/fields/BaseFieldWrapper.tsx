import React from 'react';
import { Label } from '../../ui/label';

interface FieldError {
  message?: string;
}

interface BaseFieldWrapperProps {
  name: string;
  label: string;
  required?: boolean;
  error?: FieldError;
  helpText?: string;
  description?: string;
  children: React.ReactNode;
  labelClassName?: string;
  showLabel?: boolean; // New prop to control label visibility
  helpTextPosition?: 'before' | 'after'; // New prop for help text position
}

export const BaseFieldWrapper: React.FC<BaseFieldWrapperProps> = ({
  name,
  label,
  required,
  error,
  helpText,
  description,
  children,
  labelClassName = '',
  showLabel = true,
  helpTextPosition = 'after',
}) => {
  return (
    <div className="mt-4 mb-8 block space-y-2">
      {showLabel && (
        <Label
          htmlFor={name}
          className={`text-sm leading-none font-medium ${
            required ? "after:ml-0.5 after:text-red-500 after:content-['*']" : ''
          } ${labelClassName}`}
        >
          {label}
        </Label>
      )}

      {helpTextPosition === 'before' && helpText && !error && (
        <p className="text-muted-foreground text-sm">{helpText}</p>
      )}

      {children}

      {description && !error && (
        <p id={`${name}-description`} className="text-muted-foreground text-sm">
          {description}
        </p>
      )}

      {helpTextPosition === 'after' && helpText && !error && (
        <p className="text-muted-foreground text-sm">{helpText}</p>
      )}

      {error && (
        <p className="text-destructive text-sm font-medium" role="alert">
          {String(error.message || 'Invalid value')}
        </p>
      )}
    </div>
  );
};
