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
import { useCreateWorkflow, useWorkflow } from '@/hooks/useWorkflows.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';

const WorkflowButtons: React.FC<{
  workflow: WorkflowFullInterface;
  workflowId: string;
}> = ({ workflow, workflowId }) => {
  const { router } = useStudio();
  const fetchWorkflow = useWorkflow(workflowId);
  const childWorkflow = fetchWorkflow.data;

  const createWorkflow = useCreateWorkflow();
  const runWorkflow = useRunWorkflow();

  const isRepeating = createWorkflow.isPending || runWorkflow.isPending;

  const handleRepeat = () => {
    createWorkflow.mutate(
      {
        workflowCreateDto: {
          alias: workflow.alias,
          title: null,
          workspaceId: workflow.workspaceId,
          transition: null,
          args: workflow.args ?? {},
        },
      },
      {
        onSuccess: (createdWorkflow) => {
          runWorkflow.mutate(
            {
              workflowId: createdWorkflow.id,
              runWorkflowPayloadDto: {},
              force: true,
            },
            {
              onSuccess: () => {
                void router.navigateToWorkflow(createdWorkflow.id);
              },
            },
          );
        },
      },
    );
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

  if (!childWorkflow) return null;

  return (
    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isRepeating}>
                {isRepeating ? (
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
              This will create a new run with the same arguments and redirect you to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRepeat}>Repeat</AlertDialogAction>
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
