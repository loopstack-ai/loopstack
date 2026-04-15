import { Loader2, RotateCcw, Server } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';
import { Button } from '@/components/ui/button';
import { useResetEnvironment } from '@/hooks/useEnvironments';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider';
import { SidebarPanel } from './SidebarPanel';

interface WorkbenchEnvironmentPanelProps {
  workspaceId?: string;
  environments?: WorkspaceEnvironmentInterface[];
}

export function WorkbenchEnvironmentPanel(props: WorkbenchEnvironmentPanelProps) {
  const { panelSize, setPanelSize, closePanel } = useWorkbenchLayout();
  const workspaceId = props.workspaceId;
  const resetEnvironment = useResetEnvironment();
  const [confirmingSlotId, setConfirmingSlotId] = useState<string | null>(null);

  const remoteEnvironments = props.environments?.filter((e) => !!e.agentUrl) ?? [];

  const handleReset = async (slotId: string) => {
    if (!workspaceId) return;
    try {
      await resetEnvironment.mutateAsync({ workspaceId, slotId });
      toast.success('Environment reset successfully');
    } catch {
      toast.error('Failed to reset environment');
    } finally {
      setConfirmingSlotId(null);
    }
  };

  return (
    <SidebarPanel
      icon={<Server className="h-4 w-4" />}
      title="Environment"
      description="Manage remote environments for this workspace."
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
    >
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2">
          {remoteEnvironments.map((env) => (
            <div key={env.slotId} className="bg-muted/50 rounded-md px-3 py-3">
              <div className="mb-2">
                <div className="text-sm font-medium">{env.envName || env.slotId}</div>
                <div className="text-muted-foreground text-xs">{env.type || 'remote'}</div>
              </div>

              {confirmingSlotId === env.slotId ? (
                <div className="space-y-2">
                  <p className="text-destructive text-xs">
                    This will reset the environment to its initial state. All changes, files, database, and cache will
                    be lost.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      disabled={resetEnvironment.isPending}
                      onClick={() => void handleReset(env.slotId)}
                    >
                      {resetEnvironment.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-1 h-3 w-3" />
                      )}
                      Confirm Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={resetEnvironment.isPending}
                      onClick={() => setConfirmingSlotId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setConfirmingSlotId(env.slotId)}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset Environment
                </Button>
              )}
            </div>
          ))}

          {remoteEnvironments.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">No remote environments configured.</p>
          )}
        </div>
      </div>
    </SidebarPanel>
  );
}
