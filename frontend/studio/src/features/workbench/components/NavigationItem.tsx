import { CheckCircle, File, Play } from 'lucide-react';
import * as React from 'react';
import type { WorkflowItemDto } from '@loopstack/api-client';
import { cn } from '../../../lib/utils.ts';

interface WorkbenchNavigationWorkflowItemProps {
  workflow: WorkflowItemDto;
  isSelected: boolean;
  navigateTo: (workflowId: string) => void;
}

export const NavigationItem: React.FC<WorkbenchNavigationWorkflowItemProps> = ({
  workflow,
  isSelected,
  navigateTo,
}) => {
  const isFinished = workflow.place === 'end';
  const isRunning = !isFinished && (workflow.progress ?? 0) > 0;

  const getIcon = () => {
    if (isFinished) {
      return <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />;
    } else if (isRunning) {
      return <Play className="h-4 w-4 flex-shrink-0 text-blue-500" />;
    } else {
      return <File className="h-4 w-4 flex-shrink-0 text-gray-500" />;
    }
  };

  const getProgressIndicator = () => {
    if (!isFinished && (workflow.progress ?? 0) > 0) {
      return (
        <div className="ml-auto">
          <div className="relative h-4 w-4">
            <svg className="h-4 w-4 -rotate-90 transform" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-gray-300"
              />
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${(workflow.progress ?? 0) * 0.75} 75`}
                className="text-blue-500"
              />
            </svg>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    navigateTo(workflow.id);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={cn(
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-left text-sm outline-hidden transition-colors focus-visible:ring-2',
          { 'bg-sidebar-accent text-sidebar-accent-foreground font-medium': isSelected },
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {getIcon()}
          <span className="truncate text-sm">{workflow.title ?? workflow.blockName}</span>
        </div>
        {getProgressIndicator()}
      </button>
    </div>
  );
};

export default NavigationItem;
