import { DialogTitle } from '@radix-ui/react-dialog';
import { Loader2, Star } from 'lucide-react';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  WorkspaceConfigInterface,
  WorkspaceEnvironmentInterface,
  WorkspaceItemInterface,
} from '@loopstack/contracts/api';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import { Button } from '../../../components/ui/button.tsx';
import { DialogHeader } from '../../../components/ui/dialog.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { Label } from '../../../components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select.tsx';
import { useAvailableEnvironments } from '../../../hooks/useConfig.ts';
import { useCreateWorkspace, useUpdateWorkspace } from '../../../hooks/useWorkspaces.ts';
import type { EnvironmentOption } from './EnvironmentSlotSelector.tsx';
import { EnvironmentSlotSelector } from './EnvironmentSlotSelector.tsx';

export interface CreateWorkspaceProps {
  types: WorkspaceConfigInterface[];
  workspace?: WorkspaceItemInterface;
  onSuccess: () => void;
}

const CreateWorkspace = ({ types, workspace, onSuccess }: CreateWorkspaceProps) => {
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  const [workspaceType, setWorkspaceType] = useState(types[0]?.className ?? '');
  const [isFavourite, setIsFavourite] = useState(workspace?.isFavourite ?? false);
  const [envSelections, setEnvSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    setWorkspaceType(types[0]?.className ?? '');
  }, [types]);

  // Get environment slots for the selected workspace type
  const selectedConfig = useMemo(() => types.find((t) => t.className === workspaceType), [types, workspaceType]);
  const slots = selectedConfig?.environments ?? [];

  const { data: availableEnvironments } = useAvailableEnvironments({ enabled: slots.length > 0 });

  // Map to EnvironmentOption using type as id
  const environments: EnvironmentOption[] = useMemo(
    () => availableEnvironments?.map((env) => ({ ...env, id: env.type })) ?? [],
    [availableEnvironments],
  );

  const hasEnvironments = environments.length > 0 && slots.length > 0;

  // Auto-select first matching environment per slot
  useEffect(() => {
    if (environments.length === 0 || slots.length === 0) return;

    const autoSelections: Record<string, string> = {};
    for (const slot of slots) {
      // If editing, pre-populate from workspace
      if (workspace?.environments) {
        const existing = workspace.environments.find((e) => e.slotId === slot.id);
        if (existing) {
          autoSelections[slot.id] = existing.remoteEnvironmentId;
          continue;
        }
      }
      // Auto-select first match
      const match = environments.find((env) => !slot.type || env.type === slot.type);
      if (match) {
        autoSelections[slot.id] = match.id;
      }
    }
    setEnvSelections(autoSelections);
  }, [environments, slots, workspace?.environments]);

  // Reset env selections when workspace type changes
  const handleWorkspaceTypeChange = (value: string) => {
    setWorkspaceType(value);
    setEnvSelections({});
  };

  const handleSelectEnvironment = useCallback((slotId: string, environmentId: string) => {
    setEnvSelections((prev) => ({ ...prev, [slotId]: environmentId }));
  }, []);

  const buildEnvironments = useCallback((): WorkspaceEnvironmentInterface[] | undefined => {
    if (!hasEnvironments) return undefined;
    const result: WorkspaceEnvironmentInterface[] = [];
    for (const slot of slots) {
      const envId = envSelections[slot.id];
      if (envId && envId !== '__none__') {
        const env = environments.find((e) => e.id === envId);
        const srcEnv = availableEnvironments?.find((e) => e.type === envId);
        if (env && srcEnv) {
          result.push({
            slotId: slot.id,
            type: env.type,
            remoteEnvironmentId: env.id,
            envName: env.name,
            connectionUrl: srcEnv.connectionUrl,
            agentUrl: srcEnv.agentUrl,
            workerUrl: srcEnv.connectionUrl,
            local: srcEnv.local,
          });
        }
      }
    }
    return result.length > 0 ? result : undefined;
  }, [hasEnvironments, availableEnvironments, environments, slots, envSelections]);

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get('name') as string | null;
    if (!name || !workspace) {
      return;
    }

    updateWorkspace.mutate(
      {
        id: workspace.id,
        workspaceUpdateDto: {
          title: name,
          isFavourite,
          environments: buildEnvironments(),
        },
      },
      {
        onSuccess: () => {
          onSuccess();
        },
      },
    );
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get('name') as string | null;

    if (!workspaceType) {
      return;
    }

    createWorkspace.mutate(
      {
        workspaceCreateDto: {
          title: name || undefined,
          className: workspaceType,
          isFavourite: isFavourite || undefined,
          environments: buildEnvironments(),
        },
      },
      {
        onSuccess: () => {
          console.log('closing');
          onSuccess();
        },
      },
    );
  };

  const isLoading = createWorkspace.isPending || updateWorkspace.isPending;

  return (
    <div>
      <ErrorSnackbar error={createWorkspace.error} />
      <ErrorSnackbar error={updateWorkspace.error} />

      <div className="mb-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="mb-4 text-lg leading-none font-semibold">
            {workspace ? 'Edit' : 'Add'} Workspace
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={workspace ? handleUpdate : handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="name"
                name="name"
                defaultValue={workspace?.title ?? ''}
                placeholder={'Enter workspace name (optional)'}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setIsFavourite((f) => !f)}
              >
                <Star
                  className={`h-4 w-4 ${isFavourite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                />
              </Button>
            </div>
          </div>

          {!workspace && types.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="className">Type</Label>
              <Select name="className" value={workspaceType} onValueChange={handleWorkspaceTypeChange}>
                <SelectTrigger id="className" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((item: WorkspaceConfigInterface) => (
                    <SelectItem key={item.className} value={item.className}>
                      {item.title ?? item.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasEnvironments &&
            slots.map((slot) => (
              <EnvironmentSlotSelector
                key={slot.id}
                slot={slot}
                environments={environments}
                selectedEnvironmentId={envSelections[slot.id]}
                onSelect={(envId) => handleSelectEnvironment(slot.id, envId)}
              />
            ))}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {workspace ? 'Save' : 'Create'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkspace;
