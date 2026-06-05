import { Boxes, FolderOpen, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkspaceItemInterface } from '@loopstack/contracts/api';
import type { StudioAppConfig, StudioEnvironmentSlot } from '../../api/types.ts';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Dialog, DialogContent } from '../../components/ui/dialog.tsx';
import { useComponentOverrides } from '../../providers/ComponentOverridesProvider.tsx';
import { useStudio } from '../../providers/StudioProvider.tsx';
import DefaultCreateWorkspace from '../workspaces/components/CreateWorkspace.tsx';

interface AppLauncherProps {
  apps: StudioAppConfig[];
}

export default function AppLauncher({ apps }: AppLauncherProps) {
  const { CreateWorkspace: CreateWorkspaceOverride } = useComponentOverrides();
  const CreateWorkspace = CreateWorkspaceOverride ?? DefaultCreateWorkspace;
  const { router } = useStudio();
  const [selectedApp, setSelectedApp] = useState<StudioAppConfig | null>(null);

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

  const handleSuccess = (workspace?: WorkspaceItemInterface) => {
    setSelectedApp(null);
    if (workspace) {
      void router.navigateToWorkspace(workspace.id);
    }
  };

  return (
    <>
      <div className="mb-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Card key={app.appName} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Boxes className="text-muted-foreground h-5 w-5" />
                  <CardTitle className="text-base">{app.title}</CardTitle>
                </div>
                {app.description && <CardDescription>{app.description}</CardDescription>}
              </CardHeader>
              <CardContent className="mt-auto flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" asChild>
                  <Link to={`${router.getWorkspaces()}?appName=${encodeURIComponent(app.appName)}`}>
                    <FolderOpen className="mr-1 h-4 w-4" />
                    View Workspaces
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedApp(app)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Create Workspace
                </Button>
              </CardContent>
            </Card>
          ))}
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
