import { useParams } from 'react-router-dom';
import { useWorkflow, useWorkspace } from '@loopstack/react';
import MainLayout from '../components/layout/MainLayout.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { FeatureRegistryProvider } from '../features/feature-registry';
import { RunView } from '../features/run-view/RunView.tsx';

/** Standalone, deep-linkable host for the run view — the workbench toggle is the primary entry. */
export default function RunPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { data: root } = useWorkflow(workflowId);
  const { data: workspace } = useWorkspace(root?.workspaceId);

  const breadcrumbsData = [
    { label: 'Runs', href: '/runs' },
    { label: root?.title ?? root?.workflowName ?? 'Run', current: true },
  ];

  const content = (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{root?.title ?? root?.workflowName ?? '…'}</h1>
        {root && <Badge variant="outline">{root.status}</Badge>}
        {root?.place && <Badge variant="secondary">{root.place}</Badge>}
      </div>
      <RunView workflowId={workflowId} />
    </div>
  );

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      {workspace ? <FeatureRegistryProvider appName={workspace.appName}>{content}</FeatureRegistryProvider> : content}
    </MainLayout>
  );
}
