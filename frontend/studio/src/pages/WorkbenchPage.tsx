import { Home } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { WorkspaceEnvironmentDto } from '@loopstack/api-client';
import ErrorSnackbar from '@/components/snackbars/ErrorSnackbar.tsx';
import Workbench from '@/features/workbench/Workbench.tsx';
import LoadingCentered from '../components/LoadingCentered.tsx';
import { usePipeline } from '../hooks/usePipelines.ts';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { requireParam } from '../lib/requireParam.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function WorkbenchPage({
  previewPanelOpen,
  onPreviewPanelOpenChange,
  isDeveloperMode,
  getPreviewUrl,
  getEnvironmentPreviewUrl,
  environments,
}: {
  previewPanelOpen?: boolean;
  onPreviewPanelOpenChange?: (open: boolean) => void;
  isDeveloperMode?: boolean;
  getPreviewUrl?: (pipelineId: string) => string;
  getEnvironmentPreviewUrl?: (workerId: string, pipelineId?: string) => string;
  environments?: WorkspaceEnvironmentDto[];
} = {}) {
  const { router } = useStudio();
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = requireParam(params, 'pipelineId');

  const fetchPipeline = usePipeline(pipelineId);
  const workspaceId = fetchPipeline.data?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);

  const breadcrumbData = [
    { label: 'Dashboard', href: router.getDashboard(), icon: <Home className="h-4 w-4" /> },
    { label: 'Workspaces', href: router.getWorkspaces() },
    {
      label: fetchWorkspace.data?.title ?? '',
      href: workspaceId ? router.getWorkspace(workspaceId) : undefined,
    },
    {
      label: `Run #${fetchPipeline.data?.run}${fetchPipeline.data?.title ? ` (${fetchPipeline.data.title})` : ''}`,
    },
  ];

  return (
    <div className="flex h-svh flex-col">
      <div className="flex-1 overflow-hidden">
        <ErrorSnackbar error={fetchPipeline.error} />
        <LoadingCentered loading={fetchPipeline.isLoading}>
          {fetchPipeline.data ? (
            <Workbench
              pipeline={fetchPipeline.data}
              breadcrumbData={breadcrumbData}
              previewPanelOpen={previewPanelOpen}
              onPreviewPanelOpenChange={onPreviewPanelOpenChange}
              isDeveloperMode={isDeveloperMode}
              getPreviewUrl={getPreviewUrl}
              getEnvironmentPreviewUrl={getEnvironmentPreviewUrl}
              environments={environments}
            />
          ) : !fetchPipeline.isLoading && !fetchPipeline.error ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Pipeline not found.</p>
          ) : null}
        </LoadingCentered>
      </div>
    </div>
  );
}
