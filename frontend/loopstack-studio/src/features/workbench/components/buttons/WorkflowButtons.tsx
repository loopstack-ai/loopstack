import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog.tsx';
import { Trash2, LockOpen } from 'lucide-react';
import { useDeleteWorkflow } from '@/hooks/useWorkflows.ts';
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import type { PipelineDto, WorkflowDto } from '@loopstack/api-client';
import type { WorkflowInterface, WorkflowTransitionType } from '@loopstack/contracts/types';
import { useStudio } from '@/providers/StudioProvider.tsx';

const WorkflowButtons: React.FC<{
  pipeline: PipelineDto;
  workflow: WorkflowInterface;
}> = ({ pipeline, workflow }) => {
  const { router } = useStudio();

  const deleteWorkflow = useDeleteWorkflow();
  const runPipeline = useRunPipeline();

  const handlePing = () => {
    runPipeline.mutate({
      pipelineId: pipeline.id,
      runPipelinePayloadDto: {},
      force: false
    });
  };

  const handleUnlock = () => {
    runPipeline.mutate({
      pipelineId: pipeline.id,
      runPipelinePayloadDto: {
        transition: {
          name: 'unlock',
          workflowId: workflow.id
        }
      },
      force: false
    });
  };

  const handleDelete = async () => {
    try {
      deleteWorkflow.mutate(workflow as unknown as WorkflowDto);
      handlePing();
      router.navigateToPipeline(pipeline.id);
    } catch (error) {
      // Handle any errors
      console.error('Mutation failed:', error);
    }
  };

  return (
    <div className="ml-3">
      <div className="flex">
        <TooltipProvider>
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={deleteWorkflow.isPending}
                    className="h-8 w-8 p-0 bg-transparent hover:bg-gray-100 ml-3.5 text-black"
                  >
                    {deleteWorkflow.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete workflow</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the workflow.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90 text-white"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {workflow.place === 'end' &&
            (workflow.availableTransitions as any)?.find(
              (t: WorkflowTransitionType) => t.id === 'unlock'
            ) && (
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        disabled={runPipeline.isPending}
                        className="h-8 w-8 p-0 bg-transparent hover:bg-gray-100 ml-3.5 text-black"
                      >
                        {runPipeline.isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <LockOpen className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Unlock workflow</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlock workflow</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to unlock this workflow?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnlock}>Unlock</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default WorkflowButtons;
