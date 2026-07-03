import { Boxes, FolderOpen, Plus, Server } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkspaceInterface } from '@loopstack/contracts/api';
import type { StudioAppConfig, StudioEnvironmentSlot } from '../../api/types.ts';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Dialog, DialogContent } from '../../components/ui/dialog.tsx';
import { AVAILABLE_FEATURES } from '../../features/feature-registry/available-features.ts';
import { useFilterWorkspaces } from '../../hooks/useWorkspaces.ts';
import { useComponentOverrides } from '../../providers/ComponentOverridesProvider.tsx';
import { useStudio } from '../../providers/StudioProvider.tsx';
import DefaultCreateWorkspace from '../workspaces/components/CreateWorkspace.tsx';

interface AppLauncherProps {
  apps: StudioAppConfig[];
}

interface CapabilityIcon {
  key: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function getCapabilityIcons(app: StudioAppConfig): CapabilityIcon[] {
  const icons: CapabilityIcon[] = [];

  for (const slot of (app.extensions?.['environments'] as StudioEnvironmentSlot[]) ?? []) {
    icons.push({
      key: `env:${slot.id}`,
      Icon: Server,
      label: slot.title ?? slot.id,
    });
  }

  for (const registration of app.features) {
    if (registration.enabled === false) continue;
    const feature = AVAILABLE_FEATURES[registration.id];
    if (!feature?.sidebarPanel) continue;
    icons.push({
      key: `feature:${feature.id}`,
      Icon: feature.sidebarPanel.icon,
      label: feature.sidebarPanel.label,
    });
  }

  return icons;
}

export default function AppLauncher({ apps }: AppLauncherProps) {
  const { CreateWorkspace: CreateWorkspaceOverride } = useComponentOverrides();
  const CreateWorkspace = CreateWorkspaceOverride ?? DefaultCreateWorkspace;
  const { router } = useStudio();
  const [selectedApp, setSelectedApp] = useState<StudioAppConfig | null>(null);

  const fetchWorkspaces = useFilterWorkspaces(undefined, {}, 'id', 'DESC', 0, 1000);

  const workspaceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ws of fetchWorkspaces.data?.data ?? []) {
      counts[ws.appName] = (counts[ws.appName] ?? 0) + 1;
    }
    return counts;
  }, [fetchWorkspaces.data]);

  const appTypes = useMemo(
    () =>
      selectedApp
        ? [
            {
              appName: selectedApp.appName,
              title: selectedApp.title,
              environments: (selectedApp.extensions?.['environments'] as StudioEnvironmentSlot[]) ?? [],
            },
          ]
        : [],
    [selectedApp],
  );

  const handleSuccess = (workspace?: WorkspaceInterface) => {
    setSelectedApp(null);
    if (workspace) {
      void router.navigateToWorkspace(workspace.id);
    }
  };

  return (
    <>
      <div className="mb-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const capabilityIcons = getCapabilityIcons(app);
            const workspaceCount = workspaceCounts[app.appName] ?? 0;

            return (
              <Card key={app.appName} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Boxes className="text-muted-foreground h-5 w-5" />
                      <CardTitle className="text-base">{app.title}</CardTitle>
                    </div>
                    {capabilityIcons.length > 0 && (
                      <div className="text-muted-foreground flex shrink-0 items-center gap-1">
                        {capabilityIcons.map(({ key, Icon }) => (
                          <span key={key} className="inline-flex h-6 w-6 items-center justify-center">
                            <Icon className="h-4 w-4" />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {app.description && <CardDescription>{app.description}</CardDescription>}
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="flex gap-2">
                    {workspaceCount > 0 ? (
                      <Button variant="ghost" size="sm" className="flex-1" asChild>
                        <Link to={`${router.getWorkspaces()}?appName=${encodeURIComponent(app.appName)}`}>
                          <FolderOpen className="mr-1 h-4 w-4" />
                          View Workspaces
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedApp(app)}>
                        <Plus className="mr-1 h-4 w-4" />
                        Configure
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-2xl">
          {selectedApp && <CreateWorkspace types={appTypes} onSuccess={handleSuccess} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
