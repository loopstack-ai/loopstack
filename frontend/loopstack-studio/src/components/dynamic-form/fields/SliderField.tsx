import React, { useState, useRef } from 'react';
import { Controller } from 'react-hook-form';
import type { RegisterOptions } from 'react-hook-form';
import { Slider } from '../../ui/slider';
import { BaseFieldWrapper } from './BaseFieldWrapper';
import { useFieldConfig } from '../hooks/useFieldConfig';
import type { FieldProps } from '../types';

export interface SliderFieldSchema {
  title?: string;
  help?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  default?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
}

interface SliderFieldProps extends FieldProps {
  schema: SliderFieldSchema;
}

const buildSliderValidationRules = (
  schema: SliderFieldSchema,
  required?: boolean
): RegisterOptions => {
  const min = schema.minimum ?? 0;
  const max = schema.maximum ?? 100;

  return {
    required: required ? 'This field is required' : undefined,
    min: {
      value: min,
      message: `Value must be at least ${min}`
    },
    max: {
      value: max,
      message: `Value must be at most ${max}`
    },
    validate: {
      multipleOf: (value) => {
        if (schema.multipleOf && value % schema.multipleOf !== 0) {
          return `Value must be a multiple of ${schema.multipleOf}`;
        }
        return true;
      },
      isNumber: (value) => {
        if (typeof value !== 'number' || isNaN(value)) {
          return 'Value must be a valid number';
        }
        return true;
      }
    }
  };
};

export const SliderField: React.FC<SliderFieldProps> = ({
                                                          name,
                                                          schema,
                                                          ui,
                                                          required,
                                                          form,
                                                          disabled
                                                        }) => {
  const config = useFieldConfig(name, schema, ui, disabled);

  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const min = schema.minimum ?? 0;
  const max = schema.maximum ?? 100;
  const step = schema.multipleOf ?? 1;
  const defaultValue = schema.default ?? min;

  const validationRules = buildSliderValidationRules(schema, required);

  const calculateThumbPosition = (value: number) => {
    if (!sliderRef.current) return 0;
    const sliderWidth = sliderRef.current.offsetWidth;
    const percentage = (value - min) / (max - min);
    return percentage * sliderWidth;
  };

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={defaultValue}
      rules={validationRules}
      render={({ field: { onChange, value } }) => {
        const currentValue = typeof value === 'number' && !isNaN(value) ? value : defaultValue;
        const thumbPos = calculateThumbPosition(currentValue);

        return (
          <BaseFieldWrapper
            name={name}
            label={config.fieldLabel}
            required={required}
            error={config.error}
            helpText={config.helpText}
            description={config.description}
          >
            <div className="px-2 relative" ref={sliderRef}>
              <div
                className="slider-with-hover"
                onMouseMove={(e) => {
                  if (!sliderRef.current) return;
                  const rect = sliderRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left - 8;
                  const distance = Math.abs(x - thumbPos);
                  setIsHovering(distance < 12);
                }}
                onMouseLeave={() => setIsHovering(false)}
              >
                <Slider
                  id={name}
                  value={[currentValue]}
                  onValueChange={(newValue) => {
                    if (!config.isReadOnly) {
                      onChange(newValue[0]);
                    }
                  }}
                  aria-label={config.fieldLabel}
                  step={step}
                  min={min}
                  max={max}
                  disabled={config.isDisabled}
                  className="w-full hover:cursor-pointer"
                  onPointerDown={() => setIsDragging(true)}
                  onPointerUp={() => setIsDragging(false)}
                  onPointerLeave={() => {
                    setIsDragging(false);
                    setIsHovering(false);
                  }}
                  {...config.getAriaProps()}
                />
              </div>

              {/* Tooltip showing current value */}
              {(isDragging || isHovering) && (
                <div
                  className="absolute -top-10 bg-popover text-popover-foreground px-2 py-1 rounded-md text-sm border shadow-md pointer-events-none z-10"
                  style={{
                    left: `${thumbPos}px`,
                    transform: 'translateX(-50%)'
                  }}
                  role="tooltip"
                  aria-live="polite"
                >
                  {currentValue}
                </div>
              )}

              {/* Min/Max labels */}
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground" aria-label={`Minimum value: ${min}`}>
                  {min}
                </span>
                <span className="text-xs text-muted-foreground" aria-label={`Maximum value: ${max}`}>
                  {max}
                </span>
              </div>
            </div>
          </BaseFieldWrapper>
        );
      }}
    />
  );
};