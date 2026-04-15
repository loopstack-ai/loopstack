import { Home, MonitorPlay, Play, Server } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { useFeatureRegistry } from '@/features/feature-registry';
import { cn } from '@/lib/utils';
import { useStudio } from '@/providers/StudioProvider';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function IconButton({ icon, label, active, disabled, onClick }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
            disabled
              ? 'text-muted-foreground/40 cursor-not-allowed'
              : active
                ? 'bg-foreground text-background hover:cursor-pointer'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground hover:cursor-pointer',
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

function IconLink({ icon, label, to, active }: { icon: React.ReactNode; label: string; to: string; active?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
            active
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
          )}
        >
          {icon}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

export function WorkbenchIconSidebar() {
  const { previewPanelEnabled, activePanel, togglePanel, environments, workspaceId } = useWorkbenchLayout();
  const { router } = useStudio();
  const location = useLocation();
  const features = useFeatureRegistry();

  const hasRemoteEnvironment = environments?.some((e) => !!e.agentUrl) ?? false;
  const workspacePath = router.getWorkspace(workspaceId);

  const featurePanels = features.filter((f) => f.sidebarPanel).map((f) => f.sidebarPanel!);

  return (
    <div className="border-l bg-background flex w-12 shrink-0 flex-col items-center">
      {/* Header — matches left sidebar h-12 */}
      <div className="flex h-12 shrink-0 items-center justify-center border-b w-full" />

      {/* Navigation */}
      <div className="flex flex-col items-center gap-1 py-2">
        <IconLink
          icon={<Home className="h-5 w-5" />}
          label="Workspace"
          to={workspacePath}
          active={location.pathname === workspacePath}
        />

        <IconButton
          icon={<Play className="h-5 w-5" />}
          label="Runs"
          active={activePanel === 'runs'}
          onClick={() => togglePanel('runs')}
        />
      </div>

      {/* Separator */}
      <div className="mx-2 w-6 border-t" />

      {/* Environment panels */}
      <div className="flex flex-col items-center gap-1 py-2">
        <IconButton
          icon={<MonitorPlay className="h-5 w-5" />}
          label={previewPanelEnabled ? 'Environment Preview' : 'Preview not available for this environment'}
          active={activePanel === 'preview'}
          disabled={!previewPanelEnabled}
          onClick={() => togglePanel('preview')}
        />

        <IconButton
          icon={<Server className="h-5 w-5" />}
          label={hasRemoteEnvironment ? 'Environment Settings' : 'Settings not available for this environment'}
          active={activePanel === 'environment'}
          disabled={!hasRemoteEnvironment}
          onClick={() => togglePanel('environment')}
        />

        {featurePanels.map((panel) => {
          const Icon = panel.icon;
          return (
            <IconButton
              key={panel.id}
              icon={<Icon className="h-5 w-5" />}
              label={panel.label}
              active={activePanel === panel.id}
              onClick={() => togglePanel(panel.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
