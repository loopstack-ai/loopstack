import { Check, Copy, SquareTerminal } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFeatureConfig } from '@/features/feature-registry';
import { useWorkbenchLayout } from '@/features/workbench';
import { SidebarPanel } from '@/features/workbench/components/SidebarPanel';

interface CliCommand {
  title: string;
  description?: string;
  command: string;
}

interface CliHandoffPanelProps {
  workspaceId?: string;
}

/** Substitute `{workspaceId}`/`{workflowId}` in a command; returns the filled string + whether any
 * placeholder couldn't be filled (so the card can be disabled until a run is open). */
function fill(command: string, values: Record<string, string | undefined>): { text: string; ready: boolean } {
  let ready = true;
  const text = command.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = values[key];
    if (value === undefined) {
      ready = false;
      return `{${key}}`;
    }
    return value;
  });
  return { text, ready };
}

/**
 * Generic "CLI handoff" sidebar panel: renders the app-registered `cliHandoff` commands as copy-to-clipboard
 * cards, substituting `{workspaceId}`/`{workflowId}` for the run currently in view. Enabled when the backend
 * app registers the feature via `CodeWorkspaceModule.forFeature({ commands })`.
 */
export function CliHandoffPanel({ workspaceId }: CliHandoffPanelProps) {
  const { panelSize, setPanelSize, closePanel } = useWorkbenchLayout();
  const { workflowId } = useParams();
  const feature = useFeatureConfig('cliHandoff');
  const commands = (feature?.config?.commands as CliCommand[] | undefined) ?? [];

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copy = async (index: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1500);
  };

  return (
    <SidebarPanel
      icon={<SquareTerminal className="h-4 w-4" />}
      title="CLI handoff"
      description="Prepared terminal commands for the run in view."
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
    >
      <div className="flex h-full flex-col gap-3 overflow-y-auto px-4 py-3">
        {commands.length === 0 && <p className="text-muted-foreground text-sm">No commands configured.</p>}
        {commands.map((cmd, index) => {
          const { text, ready } = fill(cmd.command, { workspaceId, workflowId });
          const copied = copiedIndex === index;
          return (
            <div key={index} className="space-y-1">
              <div className="text-sm font-medium">{cmd.title}</div>
              {cmd.description && <p className="text-muted-foreground text-xs">{cmd.description}</p>}
              <button
                type="button"
                disabled={!ready}
                onClick={() => void copy(index, text)}
                className="bg-muted/50 hover:bg-muted group relative w-full rounded-md border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                title={ready ? 'Click to copy' : 'Open a run to use this command'}
              >
                <code className="block break-all pr-6 font-mono text-xs">{text}</code>
                <span className="text-muted-foreground absolute right-2 top-2">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </span>
              </button>
              {!ready && <span className="text-muted-foreground text-xs">Open a run to fill this command.</span>}
            </div>
          );
        })}
      </div>
    </SidebarPanel>
  );
}
