import { ExternalLink, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';

const EMBED_NEW_RUN_MESSAGE_TYPE = 'loopstack:embed:new-run';

export function WorkbenchPreviewPanel() {
  const { getEnvironmentPreviewUrl, environments, closeSidePanel, selectedSlotId, setSelectedSlotId } =
    useWorkbenchLayout();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const connectableEnvironments = useMemo(
    () => (environments ?? []).filter((e) => !!e.connectionUrl && (!!e.workerId || e.local)),
    [environments],
  );

  const [previewWorkflowId, setPreviewWorkflowId] = useState<string | null>(null);

  // Auto-select first connectable environment once data arrives
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

  // Reset workflow when environment changes
  const handleEnvironmentChange = (slotId: string) => {
    setSelectedSlotId(slotId);
    setPreviewWorkflowId(null);
  };

  // Listen for new-run messages from the iframe
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

  // Still loading workspace data — show spinner
  if (environments === undefined) {
    return (
      <div className="border-l bg-zinc-950 flex w-1/2 shrink-0 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between px-3">
          <span className="text-sm font-medium text-white">Preview</span>
          <button
            onClick={closeSidePanel}
            className="text-zinc-400 hover:text-white flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  // Loaded but no connectable environments
  if (!getEnvironmentPreviewUrl || connectableEnvironments.length === 0) {
    return (
      <div className="border-l bg-zinc-950 flex w-1/2 shrink-0 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between px-3">
          <span className="text-sm font-medium text-white">Preview</span>
          <button
            onClick={closeSidePanel}
            className="text-zinc-400 hover:text-white flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-zinc-400 flex flex-1 items-center justify-center text-sm">Preview not available</div>
      </div>
    );
  }

  return (
    <div className="border-l bg-zinc-950 flex w-1/2 shrink-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Preview</span>
          {connectableEnvironments.length > 1 && (
            <Select value={selectedSlotId} onValueChange={handleEnvironmentChange}>
              <SelectTrigger className="h-7 w-40 border-zinc-700 bg-zinc-900 text-zinc-200 text-xs">
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
          )}
          {connectableEnvironments.length === 1 && selectedEnv && (
            <span className="text-xs text-zinc-400">{selectedEnv.envName || selectedEnv.slotId}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {previewUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open in new tab</TooltipContent>
            </Tooltip>
          )}
          <button
            onClick={closeSidePanel}
            className="text-zinc-400 hover:text-white flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {previewUrl ? (
        <div className="flex-1 overflow-hidden p-3 pt-0">
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="bg-background h-full w-full rounded-lg"
            title="Workflow preview"
          />
        </div>
      ) : (
        <div className="text-zinc-400 flex flex-1 items-center justify-center text-sm">Preview not available</div>
      )}
    </div>
  );
}
