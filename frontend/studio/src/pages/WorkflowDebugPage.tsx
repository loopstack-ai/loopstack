import { ReactFlowProvider } from '@xyflow/react';
import { Bug, Home, Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import MainLayout from '@/components/layout/MainLayout.tsx';
import { WorkflowDebugHeader, WorkflowFlowViewer } from '@/features/debug';
import { useChildWorkflows, useWorkflow, useWorkflowConfigByName } from '@/hooks/useWorkflows.ts';
import { useWorkspace } from '@/hooks/useWorkspaces.ts';
import { requireParam } from '@/lib/requireParam.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';

const WorkflowDebugPage: React.FC = () => {
  const { router } = useStudio();
  const params = useParams<{ workflowId: string }>();
  const workflowId = requireParam(params, 'workflowId');

  const fetchWorkflow = useWorkflow(workflowId);
  const workspaceId = fetchWorkflow.data?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);
  const fetchChildWorkflows = useChildWorkflows(workflowId);
  const childWorkflows = useMemo(() => fetchChildWorkflows.data ?? [], [fetchChildWorkflows.data]);
  const fetchWorkflowConfig = useWorkflowConfigByName(fetchWorkflow.data?.className ?? undefined);

  const breadcrumbData = useMemo(
    () => [
      { label: 'Dashboard', href: router.getDashboard(), icon: <Home className="h-4 w-4" /> },
      { label: 'Workspaces', href: router.getWorkspaces() },
      {
        label: fetchWorkspace.data?.title ?? '...',
        href: workspaceId ? router.getWorkspace(workspaceId) : undefined,
      },
      {
        label: `Run #${fetchWorkflow.data?.run ?? '...'}`,
        href: router.getWorkflow(workflowId),
      },
      {
        label: 'Debug Flow',
        icon: <Bug className="h-4 w-4" />,
      },
    ],
    [fetchWorkspace.data, fetchWorkflow.data, workspaceId, workflowId, router],
  );

  const isLoading = fetchWorkflow.isLoading || fetchChildWorkflows.isLoading || fetchWorkspace.isLoading;

  if (isLoading) {
    return (
      <MainLayout breadcrumbsData={breadcrumbData}>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbsData={breadcrumbData}>
      <ErrorSnackbar error={fetchWorkflow.error} />

      <div className="flex h-[calc(100vh-8rem)] flex-col gap-6">
        <WorkflowDebugHeader
          title={fetchWorkflow.data?.title ?? fetchWorkflow.data?.alias ?? 'Workflow'}
          runNumber={fetchWorkflow.data?.run}
          onBack={() => void router.navigateToWorkflow(workflowId)}
        />

        <div className="bg-card border-border flex-1 overflow-hidden rounded-2xl border shadow-sm">
          {childWorkflows.length > 0 ? (
            <ReactFlowProvider>
              <WorkflowFlowViewer
                workflowId={workflowId}
                workflows={childWorkflows}
                workflowConfig={fetchWorkflowConfig.data}
              />
            </ReactFlowProvider>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <p className="font-medium">No child workflows found for this workflow</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default WorkflowDebugPage;
