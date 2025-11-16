import * as React from 'react';
import type { WorkflowItemDto } from '@loopstack/api-client';
import { File, Play, CheckCircle } from 'lucide-react';
import { cn } from '../../../utils/utils.ts';

interface WorkbenchNavigationWorkflowItemProps {
  workflow: WorkflowItemDto;
  isSelected: boolean;
  navigateTo: (workflowId: string) => void;
}

export const WorkbenchNavigationWorkflowItem: React.FC<WorkbenchNavigationWorkflowItemProps> = ({
  workflow,
  isSelected,
  navigateTo
}) => {
  const isFinished = workflow.place === 'end';
  const isRunning = !isFinished && (workflow.progress ?? 0) > 0;

  const getIcon = () => {
    if (isFinished) {
      return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
    } else if (isRunning) {
      return <Play className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    } else {
      return <File className="h-4 w-4 text-gray-500 flex-shrink-0" />;
    }
  };

  const getProgressIndicator = () => {
    if (!isFinished && (workflow.progress ?? 0) > 0) {
      return (
        <div className="ml-auto">
          <div className="relative w-4 h-4">
            <svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 32 32">
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
          'w-full flex items-center justify-between p-2 text-left rounded-md text-sm outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer',
          { 'bg-sidebar-accent text-sidebar-accent-foreground font-medium': isSelected }
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {getIcon()}
          <span className="truncate text-sm">{workflow.title ?? workflow.configKey}</span>
        </div>
        {getProgressIndicator()}
      </button>
    </div>
  );
};

export default WorkbenchNavigationWorkflowItem;
