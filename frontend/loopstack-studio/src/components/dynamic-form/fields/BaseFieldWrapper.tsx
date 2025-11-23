import React from 'react';
import { Label } from '../../ui/label';

interface BaseFieldWrapperProps {
  name: string;
  label: string;
  required?: boolean;
  error?: any;
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
                                                                    helpTextPosition = 'after'
                                                                  }) => {
  return (
    <div className="space-y-2 block mt-4 mb-8">
      {showLabel && (
        <Label
          htmlFor={name}
          className={`text-sm font-medium leading-none ${
            required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ''
          } ${labelClassName}`}
        >
          {label}
        </Label>
      )}

      {helpTextPosition === 'before' && helpText && !error && (
        <p className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}

      {children}

      {description && !error && (
        <p id={`${name}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {helpTextPosition === 'after' && helpText && !error && (
        <p className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {String(error.message || 'Invalid value')}
        </p>
      )}
    </div>
  );
};