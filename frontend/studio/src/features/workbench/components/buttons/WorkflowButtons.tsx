import { LockOpen, Repeat } from 'lucide-react';
import React from 'react';
import type { PipelineInterface, WorkflowItemInterface } from '@loopstack/contracts/api';
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
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { useDeleteWorkflow, useWorkflow } from '@/hooks/useWorkflows.ts';

const WorkflowButtons: React.FC<{
  pipeline: PipelineInterface;
  workflowId: string;
}> = ({ pipeline, workflowId }) => {
  const fetchWorkflow = useWorkflow(workflowId);
  const workflow = fetchWorkflow.data;

  const deleteWorkflow = useDeleteWorkflow();
  const runPipeline = useRunPipeline();

  const handlePing = () => {
    runPipeline.mutate({
      pipelineId: pipeline.id,
      runPipelinePayloadDto: {},
      force: false,
    });
  };

  const handleUnlock = () => {
    runPipeline.mutate({
      pipelineId: pipeline.id,
      runPipelinePayloadDto: {
        transition: {
          name: 'unlock',
          workflowId: workflowId,
        },
      },
      force: false,
    });
  };

  const handleDelete = () => {
    if (!workflow) return;
    try {
      deleteWorkflow.mutate(workflow as unknown as WorkflowItemInterface);
      handlePing();
    } catch (error) {
      console.error('Mutation failed:', error);
    }
  };

  if (!workflow) return null;

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
              This will delete the current workflow run and re-trigger the pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Repeat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {workflow.place === 'end' &&
        workflow.availableTransitions?.find((t) => (t as { id: string }).id === 'unlock') && (
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={runPipeline.isPending}>
                    {runPipeline.isPending ? (
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
