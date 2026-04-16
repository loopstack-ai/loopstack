import { GitBranch, Loader2 } from 'lucide-react';
import { useWorkbenchLayout } from '@/features/workbench';
import { SidebarPanel } from '@/features/workbench/components/SidebarPanel';
import { useRunWorkflow } from '@/hooks/useProcessor';
import { useCreateWorkflow } from '@/hooks/useWorkflows';
import { useStudio } from '@/providers/StudioProvider';
import { useGitInvalidation, useGitLog, useGitRemote, useGitStatus, useRemoveGitRemote } from '../hooks/useGit';
import { GitBranchBadge } from './GitBranchBadge';
import { GitCommitList } from './GitCommitList';
import { GitRemoteStatus } from './GitRemoteStatus';

interface WorkbenchGitPanelProps {
  workspaceId?: string;
}

export function WorkbenchGitPanel({ workspaceId }: WorkbenchGitPanelProps) {
  const { panelSize, setPanelSize, closePanel } = useWorkbenchLayout();
  const { router } = useStudio();
  const { data: status, isLoading: statusLoading } = useGitStatus(workspaceId);
  const { data: logData, isLoading: logLoading } = useGitLog(workspaceId);
  const { data: remote } = useGitRemote(workspaceId);
  useGitInvalidation(workspaceId);

  const createWorkflow = useCreateWorkflow();
  const runWorkflow = useRunWorkflow();
  const removeRemote = useRemoveGitRemote();
  const isConnecting = createWorkflow.isPending || runWorkflow.isPending;

  const handleConnectGitHub = () => {
    if (!workspaceId) return;

    createWorkflow.mutate(
      {
        workflowCreateDto: {
          alias: 'connectGitHub',
          title: null,
          workspaceId,
          transition: null,
          args: {},
        },
      },
      {
        onSuccess: (createdWorkflow) => {
          runWorkflow.mutate(
            {
              workflowId: createdWorkflow.id,
              runWorkflowPayloadDto: {},
              force: true,
            },
            {
              onSuccess: () => {
                void router.navigateToWorkflow(createdWorkflow.id);
              },
            },
          );
        },
      },
    );
  };

  const isLoading = statusLoading || logLoading;

  return (
    <SidebarPanel
      icon={<GitBranch className="h-4 w-4" />}
      title="Git"
      description="Source control for this workspace."
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-sm">Loading...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {status && <GitBranchBadge status={status} />}

              <div>
                <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Remote</h4>
                <GitRemoteStatus
                  remote={remote}
                  onConnect={handleConnectGitHub}
                  isConnecting={isConnecting}
                  onRemove={workspaceId ? () => removeRemote.mutate({ workspaceId }) : undefined}
                  isRemoving={removeRemote.isPending}
                />
              </div>

              <div>
                <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Recent Commits</h4>
                <GitCommitList commits={logData?.commits ?? []} />
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarPanel>
  );
}
