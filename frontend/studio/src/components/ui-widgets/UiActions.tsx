import React, { Fragment } from 'react';
import type { UiWidgetType } from '@loopstack/contracts/types';
import UiWidget from '@/components/ui-widgets/UiWidget.tsx';

export interface UiActionsProps {
  availableTransitions: string[];
  currentPlace?: string;
  actions: UiWidgetType[];
  disabled: boolean;
  onSubmit: (transition: string, data: Record<string, unknown> | string | undefined) => void;
  isLoading?: boolean;
}

const UiActions: React.FC<UiActionsProps> = ({
  actions,
  availableTransitions,
  currentPlace,
  disabled,
  onSubmit,
  isLoading,
}) => {
  return (
    <div className="flex w-full flex-col items-end gap-4">
      {actions.map((config: UiWidgetType, index: number) => {
        const { enabledWhen, showWhen } = config;
        const transition = (config.options as { transition?: string } | undefined)?.transition;

        // showWhen: hide the widget entirely if the current place doesn't match
        if (showWhen !== undefined && (!currentPlace || !showWhen.includes(currentPlace))) {
          return null;
        }

        const isDisabled =
          disabled ||
          (enabledWhen !== undefined && (!currentPlace || !enabledWhen.includes(currentPlace))) ||
          (transition !== undefined && !availableTransitions.includes(transition));

        const handleSubmit = (data?: Record<string, unknown> | string) => {
          console.log('[UiActions] handleSubmit called', {
            transition,
            data,
            isDisabled,
            currentPlace,
            availableTransitions,
          });
          if (!transition) {
            console.error(`[UiActions] Widget "${config.widget}" has no transition configured.`);
            return;
          }
          onSubmit(transition, data);
        };

        return (
          <Fragment key={`ui-widget-${index}-${transition ?? config.widget}`}>
            <UiWidget config={config} onSubmit={handleSubmit} disabled={isDisabled} isLoading={isLoading} />
          </Fragment>
        );
      })}
    </div>
  );
};

export default UiActions;
