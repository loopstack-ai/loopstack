import { ReactFlowProvider } from '@xyflow/react';
import { Bug, Home, Loader2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout.tsx';
import ErrorSnackbar from '@/components/snackbars/ErrorSnackbar.tsx';
import PipelineDebugHeader from '@/features/debug/components/PipelineDebugHeader.tsx';
import PipelineFlowViewer from '@/features/debug/components/PipelineFlowViewer.tsx';
import { usePipeline, usePipelineConfig } from '@/hooks/usePipelines.ts';
import { useFetchWorkflowsByPipeline } from '@/hooks/useWorkflows.ts';
import { useWorkspace } from '@/hooks/useWorkspaces.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';

const PipelineDebugPage: React.FC = () => {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const { router } = useStudio();
  const { pipelineId } = useParams<{ pipelineId: string }>();

  const fetchPipeline = usePipeline(pipelineId);
  const workspaceId = fetchPipeline.data?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);
  const fetchWorkflows = useFetchWorkflowsByPipeline(pipelineId ?? '');
  const workflows = useMemo(() => fetchWorkflows.data ?? [], [fetchWorkflows.data]);
  const workspaceBlockName = fetchWorkspace.data?.blockName;
  const pipelineBlockName = fetchPipeline.data?.blockName;
  const fetchPipelineConfig = usePipelineConfig(workspaceBlockName, pipelineBlockName);

  const breadcrumbData = useMemo(
    () => [
      { label: 'Dashboard', href: router.getDashboard(), icon: <Home className="h-4 w-4" /> },
      { label: 'Workspaces', href: router.getWorkspaces() },
      {
        label: fetchWorkspace.data?.title ?? '...',
        href: workspaceId ? router.getWorkspace(workspaceId) : undefined,
      },
      {
        label: `Run #${fetchPipeline.data?.run ?? '...'}`,
        href: pipelineId ? router.getPipeline(pipelineId) : undefined,
      },
      {
        label: 'Debug Flow',
        icon: <Bug className="h-4 w-4" />,
      },
    ],
    [fetchWorkspace.data, fetchPipeline.data, workspaceId, pipelineId, router],
  );

  const isLoading = fetchPipeline.isLoading || fetchWorkflows.isLoading || fetchWorkspace.isLoading;

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
      <ErrorSnackbar error={fetchPipeline.error} />

      <div className="flex h-[calc(100vh-8rem)] flex-col gap-6">
        <PipelineDebugHeader
          title={fetchPipeline.data?.title ?? fetchPipeline.data?.blockName ?? 'Pipeline'}
          runNumber={fetchPipeline.data?.run}
          onBack={() => pipelineId && void router.navigateToPipeline(pipelineId)}
          animationsEnabled={animationsEnabled}
          onToggleAnimations={() => setAnimationsEnabled(!animationsEnabled)}
        />

        <div className="bg-card border-border flex-1 overflow-hidden rounded-2xl border shadow-sm">
          {pipelineId && workflows.length > 0 ? (
            <ReactFlowProvider>
              <PipelineFlowViewer
                pipelineId={pipelineId}
                workflows={workflows}
                pipelineConfig={fetchPipelineConfig.data}
                animationsEnabled={animationsEnabled}
              />
            </ReactFlowProvider>
          ) : pipelineId ? (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <p className="font-medium">No workflows found for this pipeline</p>
            </div>
          ) : null}
        </div>
      </div>
    </MainLayout>
  );
};

export default PipelineDebugPage;
