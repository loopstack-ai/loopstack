import { Hammer } from 'lucide-react';
import React from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import { Button } from '../../../../components/ui/button.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../components/ui/tooltip.tsx';
import { useRunWorkflow } from '../../../../hooks/useProcessor.ts';

interface WorkflowRunButtonsProps {
  workflow: WorkflowFullInterface;
}

const WorkflowRunButtons: React.FC<WorkflowRunButtonsProps> = ({ workflow }) => {
  const runWorkflow = useRunWorkflow();

  const handlePing = () => {
    runWorkflow.mutate({
      workflowId: workflow.id,
      runWorkflowPayloadDto: {},
      force: false,
    });
  };

  return (
    <div className="ml-3">
      <div className="flex">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={handlePing}
                disabled={runWorkflow.isPending}
                className="ml-3.5 h-8 w-8 bg-transparent p-0 text-black hover:bg-gray-100"
              >
                {runWorkflow.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Hammer className="w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ping workflow</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default WorkflowRunButtons;
