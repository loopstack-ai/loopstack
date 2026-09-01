import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider';

/**
 * Picks the active workspace environment (slot) that environment-scoped panels (file explorer, git,
 * preview) target. Hidden when the workspace has at most one environment. Shows each slot's live status.
 */
export function EnvironmentSelector() {
  const { environments, selectedSlotId, setSelectedSlotId } = useWorkbenchLayout();
  const envs = environments ?? [];
  if (envs.length <= 1) return null;

  return (
    <div className="border-b px-3 py-2">
      <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Select environment" />
        </SelectTrigger>
        <SelectContent>
          {envs.map((env) => (
            <SelectItem key={env.slotId} value={env.slotId} className="text-xs">
              <span className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    env.status === 'running' ? 'bg-green-500' : 'bg-muted-foreground/40'
                  }`}
                />
                {env.envName || env.slotId}
                {env.status !== 'running' && <span className="text-muted-foreground">(stopped)</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
