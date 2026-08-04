import { useParams } from 'react-router-dom';
import { useWorkflow } from '@loopstack/react';
import MainLayout from '../components/layout/MainLayout.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { RunView } from '../features/run-view/RunView.tsx';

/** Standalone, deep-linkable host for the run view — the workbench toggle is the primary entry. */
export default function RunPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { data: root } = useWorkflow(workflowId);

  const breadcrumbsData = [
    { label: 'Runs', href: '/runs' },
    { label: root?.title ?? root?.workflowName ?? 'Run', current: true },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{root?.title ?? root?.workflowName ?? '…'}</h1>
          {root && <Badge variant="outline">{root.status}</Badge>}
          {root?.place && <Badge variant="secondary">{root.place}</Badge>}
        </div>
        <RunView workflowId={workflowId} />
      </div>
    </MainLayout>
  );
}
