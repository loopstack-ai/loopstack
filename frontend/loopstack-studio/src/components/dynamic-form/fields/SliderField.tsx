import React, { useState, useRef } from 'react';
import { Controller } from 'react-hook-form';
import { Slider } from '../../ui/slider';
import { Label } from '../../ui/label';
import type { FieldProps } from '../types.ts';

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

export const SliderField: React.FC<SliderFieldProps> = ({
  name,
  schema,
  required,
  form,
  disabled
}) => {
  const fieldLabel = schema.title || name;
  const helpText = schema?.help || schema.description || '';

  const isDisabled = schema?.disabled || disabled;
  const isReadOnly = schema?.readonly;

  const errors = form.formState.errors;

  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const calculateThumbPosition = (value: number, min: number = 0, max: number = 100) => {
    if (!sliderRef.current) return 0;
    const sliderWidth = sliderRef.current.offsetWidth;
    const percentage = (value - min) / (max - min);
    return percentage * sliderWidth;
  };

  return (
    <Controller
      name={name}
      control={form.control}
      defaultValue={schema.default !== undefined ? schema.default : schema.minimum}
      render={({ field: { onChange, value } }) => {
        const currentValue = typeof value === 'number' ? value : schema.minimum || 0;
        const thumbPos = calculateThumbPosition(
          currentValue,
          schema.minimum || 0,
          schema.maximum || 100
        );

        return (
          <div className="my-4 mb-8 space-y-3">
            <Label id={`slider-label-${name}`} htmlFor={name} className="text-sm font-medium">
              {fieldLabel} {required && <span className="text-destructive">*</span>}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
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
                    if (!isReadOnly) {
                      onChange(newValue[0]);
                    }
                  }}
                  aria-label={fieldLabel}
                  aria-labelledby={`slider-label-${name}`}
                  step={schema.multipleOf || 1}
                  min={schema.minimum}
                  max={schema.maximum}
                  disabled={isDisabled}
                  className="w-full hover:cursor-pointer"
                  onPointerDown={() => setIsDragging(true)}
                  onPointerUp={() => setIsDragging(false)}
                  onPointerLeave={() => {
                    setIsDragging(false);
                    setIsHovering(false);
                  }}
                />
              </div>
              {(isDragging || isHovering) && (
                <div
                  className="absolute -top-10 bg-popover text-popover-foreground px-2 py-1 rounded-md text-sm border shadow-md pointer-events-none z-10"
                  style={{
                    left: `${thumbPos}px`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {currentValue}
                </div>
              )}
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">{schema.minimum}</span>
                <span className="text-xs text-muted-foreground">{schema.maximum}</span>
              </div>
            </div>
            {errors[name] && (
              <p className="text-sm text-destructive">{errors[name]?.message?.toString()}</p>
            )}
          </div>
        );
      }}
    />
  );
};
