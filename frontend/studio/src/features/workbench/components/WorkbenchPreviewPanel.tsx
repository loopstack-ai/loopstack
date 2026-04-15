import { Loader2, MonitorPlay } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';
import { SidebarPanel } from './SidebarPanel.tsx';

const EMBED_NEW_RUN_MESSAGE_TYPE = 'loopstack:embed:new-run';

export function WorkbenchPreviewPanel() {
  const {
    getEnvironmentPreviewUrl,
    environments,
    closePanel,
    panelSize,
    setPanelSize,
    selectedSlotId,
    setSelectedSlotId,
  } = useWorkbenchLayout();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const connectableEnvironments = useMemo(
    () => (environments ?? []).filter((e) => !!e.connectionUrl && (!!e.workerId || e.local)),
    [environments],
  );

  const [previewWorkflowId, setPreviewWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSlotId && connectableEnvironments.length > 0) {
      setSelectedSlotId(connectableEnvironments[0].slotId);
    }
  }, [connectableEnvironments, selectedSlotId, setSelectedSlotId]);

  const selectedEnv = useMemo(
    () => connectableEnvironments.find((e) => e.slotId === selectedSlotId),
    [connectableEnvironments, selectedSlotId],
  );

  const previewUrl = useMemo(() => {
    if (!getEnvironmentPreviewUrl || !selectedEnv) return undefined;
    return getEnvironmentPreviewUrl(selectedEnv, previewWorkflowId ?? undefined);
  }, [getEnvironmentPreviewUrl, selectedEnv, previewWorkflowId]);

  const handleEnvironmentChange = (slotId: string) => {
    setSelectedSlotId(slotId);
    setPreviewWorkflowId(null);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as Record<string, unknown> | null;
      if (data?.type !== EMBED_NEW_RUN_MESSAGE_TYPE) return;
      const newWorkflowId = data?.workflowId;
      if (typeof newWorkflowId === 'string') {
        setPreviewWorkflowId(newWorkflowId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Still loading workspace data
  if (environments === undefined) {
    return (
      <SidebarPanel
        icon={<MonitorPlay className="h-4 w-4" />}
        title="Preview"
        size={panelSize}
        onSizeChange={setPanelSize}
        onClose={closePanel}
      >
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </SidebarPanel>
    );
  }

  // No connectable environments
  if (!getEnvironmentPreviewUrl || connectableEnvironments.length === 0) {
    return (
      <SidebarPanel
        icon={<MonitorPlay className="h-4 w-4" />}
        title="Preview"
        size={panelSize}
        onSizeChange={setPanelSize}
        onClose={closePanel}
      >
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Preview not available
        </div>
      </SidebarPanel>
    );
  }

  return (
    <SidebarPanel
      icon={<MonitorPlay className="h-4 w-4" />}
      title="Preview"
      description={
        connectableEnvironments.length === 1 && selectedEnv ? selectedEnv.envName || selectedEnv.slotId : undefined
      }
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
      expandUrl={previewUrl}
    >
      <div className="flex h-full flex-col">
        {connectableEnvironments.length > 1 && (
          <div className="border-b px-4 py-2">
            <Select value={selectedSlotId} onValueChange={handleEnvironmentChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {connectableEnvironments.map((env) => (
                  <SelectItem key={env.slotId} value={env.slotId}>
                    {env.envName || env.slotId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {previewUrl ? (
          <div className="flex-1 overflow-hidden p-3">
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="bg-muted h-full w-full rounded-lg border"
              title="Workflow preview"
            />
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Preview not available
          </div>
        )}
      </div>
    </SidebarPanel>
  );
}
