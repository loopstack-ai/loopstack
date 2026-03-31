import { Home } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { Workbench } from '@/features/workbench';
import { useWorkflow } from '../hooks/useWorkflows.ts';
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
  getPreviewUrl?: (workflowId: string) => string;
  getEnvironmentPreviewUrl?: (env: WorkspaceEnvironmentInterface, workflowId?: string) => string;
  environments?: WorkspaceEnvironmentInterface[];
} = {}) {
  const { router } = useStudio();
  const params = useParams<{ workflowId: string }>();
  const workflowId = requireParam(params, 'workflowId');

  const fetchWorkflow = useWorkflow(workflowId);
  const workspaceId = fetchWorkflow.data?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);

  const resolvedEnvironments = useMemo(
    () => environments ?? fetchWorkspace.data?.environments,
    [environments, fetchWorkspace.data?.environments],
  );

  const defaultGetEnvironmentPreviewUrl = useCallback((env: WorkspaceEnvironmentInterface, workflowId?: string) => {
    if (!env.connectionUrl) return '';
    const params = new URLSearchParams({
      url: env.connectionUrl,
      name: env.envName || env.workerId || '',
    });
    const base = `/embed/env/preview`;
    return workflowId ? `${base}/workflows/${workflowId}?${params}` : `${base}?${params}`;
  }, []);

  const resolvedGetEnvironmentPreviewUrl = getEnvironmentPreviewUrl ?? defaultGetEnvironmentPreviewUrl;

  const breadcrumbData = [
    { label: 'Dashboard', href: router.getDashboard(), icon: <Home className="h-4 w-4" /> },
    { label: 'Workspaces', href: router.getWorkspaces() },
    {
      label: fetchWorkspace.data?.title ?? '',
      href: workspaceId ? router.getWorkspace(workspaceId) : undefined,
    },
    {
      label: `Run #${fetchWorkflow.data?.run}${fetchWorkflow.data?.title ? ` (${fetchWorkflow.data.title})` : ''}`,
    },
  ];

  return (
    <div className="flex h-svh flex-col">
      <div className="flex-1 overflow-hidden">
        <ErrorSnackbar error={fetchWorkflow.error} />
        <LoadingCentered loading={fetchWorkflow.isLoading}>
          {fetchWorkflow.data ? (
            <Workbench
              workflow={fetchWorkflow.data}
              breadcrumbData={breadcrumbData}
              previewPanelOpen={previewPanelOpen}
              onPreviewPanelOpenChange={onPreviewPanelOpenChange}
              isDeveloperMode={isDeveloperMode}
              getPreviewUrl={getPreviewUrl}
              getEnvironmentPreviewUrl={resolvedGetEnvironmentPreviewUrl}
              environments={resolvedEnvironments}
            />
          ) : !fetchWorkflow.isLoading && !fetchWorkflow.error ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Workflow not found.</p>
          ) : null}
        </LoadingCentered>
      </div>
    </div>
  );
}
