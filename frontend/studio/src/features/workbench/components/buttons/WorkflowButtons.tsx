import { LockOpen, Repeat } from 'lucide-react';
import React from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { useRunWorkflow } from '@/hooks/useProcessor.ts';
import { useDeleteWorkflow, useWorkflow } from '@/hooks/useWorkflows.ts';

const WorkflowButtons: React.FC<{
  workflow: WorkflowFullInterface;
  workflowId: string;
}> = ({ workflow, workflowId }) => {
  const fetchWorkflow = useWorkflow(workflowId);
  const childWorkflow = fetchWorkflow.data;

  const deleteWorkflow = useDeleteWorkflow();
  const runWorkflow = useRunWorkflow();

  const handlePing = () => {
    runWorkflow.mutate({
      workflowId: workflow.id,
      runWorkflowPayloadDto: {},
      force: false,
    });
  };

  const handleUnlock = () => {
    runWorkflow.mutate({
      workflowId: workflow.id,
      runWorkflowPayloadDto: {
        transition: {
          name: 'unlock',
          workflowId: workflowId,
        },
      },
      force: false,
    });
  };

  const handleDelete = () => {
    if (!childWorkflow) return;
    try {
      deleteWorkflow.mutate(childWorkflow.id);
      handlePing();
    } catch (error) {
      console.error('Mutation failed:', error);
    }
  };

  if (!childWorkflow) return null;

  return (
    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={deleteWorkflow.isPending}>
                {deleteWorkflow.isPending ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Repeat className="h-3.5 w-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Repeat</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Repeat workflow</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the current workflow run and re-trigger the workflow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Repeat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {childWorkflow.place === 'end' &&
        childWorkflow.availableTransitions?.find((t) => (t as { id: string }).id === 'unlock') && (
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={runWorkflow.isPending}>
                    {runWorkflow.isPending ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <LockOpen className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Unlock Step</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unlock workflow</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to unlock this workflow?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleUnlock}>Unlock</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
    </div>
  );
};

export default WorkflowButtons;
