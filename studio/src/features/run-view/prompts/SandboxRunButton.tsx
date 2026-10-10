import { MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { useOptionalWorkbenchLayout } from '@/features/workbench';

/**
 * Auxiliary `sandbox-run` control — not a prompt (no transition, answers nothing):
 * opens the preview environment for its slot. Renders only when hosted inside the
 * workbench (the standalone run page has no preview panel to open).
 */
export function SandboxRunButton({ slotId, label }: { slotId?: string; label?: string }) {
  const layout = useOptionalWorkbenchLayout();
  if (!layout || !slotId) return null;

  const env = layout.environments?.find((candidate) => candidate.slotId === slotId);
  if (!env) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="outline" size="icon" onClick={() => layout.openPreviewWithEnvironment(slotId)}>
          <MonitorPlay className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label ?? (env.envName ? `Open ${env.envName}` : 'Open Sandbox')}</TooltipContent>
    </Tooltip>
  );
}
