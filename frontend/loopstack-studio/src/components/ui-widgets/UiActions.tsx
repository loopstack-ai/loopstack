import React, { Fragment } from 'react';
import type { UiWidgetType } from '@loopstack/contracts/types';
import UiWidget from '@/components/ui-widgets/UiWidget.tsx';

export interface UiActionsProps {
  availableTransitions: string[];
  actions: UiWidgetType[];
  disabled: boolean;
  onSubmit: (transition: string, data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

const UiActions: React.FC<UiActionsProps> = ({ actions, availableTransitions, disabled, onSubmit, isLoading }) => {
  return (
    <div className="mt-4 flex w-full justify-end">
      {actions.map((config: UiWidgetType, index: number) => {
        const isDisabled =
          disabled || config.transition === undefined || !availableTransitions.includes(config.transition);

        const handleSubmit = (data?: Record<string, unknown> | string) => {
          onSubmit(config.transition, typeof data === 'object' ? (data ?? {}) : {});
        };

        return (
          <Fragment key={`ui-widget-${index}-${config.transition}`}>
            <UiWidget config={config} onSubmit={handleSubmit} disabled={isDisabled} isLoading={isLoading} />
          </Fragment>
        );
      })}
    </div>
  );
};

export default UiActions;
