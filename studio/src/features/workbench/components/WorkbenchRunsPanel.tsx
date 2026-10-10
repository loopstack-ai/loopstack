import { Loader2, Play } from 'lucide-react';
import ExecutionTimeline from '@/features/workspaces/components/ExecutionTimeline';
import { useWorkspace } from '@/hooks/useWorkspaces';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider';
import { SidebarPanel } from './SidebarPanel';

export function WorkbenchRunsPanel() {
  const { workspaceId, panelSize, setPanelSize, closePanel } = useWorkbenchLayout();
  const { data: workspace, isLoading } = useWorkspace(workspaceId);

  return (
    <SidebarPanel
      icon={<Play className="h-4 w-4" />}
      title="Runs"
      description="Workflow execution history for this workspace."
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
    >
      <div className="h-full overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : workspace ? (
          <ExecutionTimeline workspace={workspace} />
        ) : null}
      </div>
    </SidebarPanel>
  );
}
