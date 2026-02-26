import { LockOpen, Trash2 } from 'lucide-react';
import React from 'react';
import type { PipelineDto, WorkflowDto } from '@loopstack/api-client';
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
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { useDeleteWorkflow } from '@/hooks/useWorkflows.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';

const WorkflowButtons: React.FC<{
  pipeline: PipelineDto;
  workflow: WorkflowDto;
}> = ({ pipeline, workflow }) => {
  const { router } = useStudio();

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
          workflowId: workflow.id,
        },
      },
      force: false,
    });
  };

  const handleDelete = () => {
    try {
      deleteWorkflow.mutate(workflow);
      handlePing();
      void router.navigateToPipeline(pipeline.id);
    } catch (error) {
      // Handle any errors
      console.error('Mutation failed:', error);
    }
  };

  return (
    <div>
      <div className="flex">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={deleteWorkflow.isPending}>
              {deleteWorkflow.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete and Repeat Workflow
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the workflow.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-white" onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {workflow.place === 'end' &&
          workflow.availableTransitions?.find((t) => (t as { id: string }).id === 'unlock') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={runPipeline.isPending}>
                  {runPipeline.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <LockOpen className="h-4 w-4" />
                  )}
                  Unlock Step
                </Button>
              </AlertDialogTrigger>
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
    </div>
  );
};

export default WorkflowButtons;
