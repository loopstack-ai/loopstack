import * as React from 'react';
import { useCreateWorkspace, useUpdateWorkspace } from '../../../hooks/useWorkspaces.ts';
import ErrorSnackbar from '../../../components/snackbars/ErrorSnackbar';
import { useEffect, useState } from 'react';
import type { WorkspaceConfigDto, WorkspaceItemDto } from '@loopstack/api-client';
import { Button } from '../../../components/ui/button.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { Label } from '../../../components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../components/ui/select.tsx';
import { Loader2 } from 'lucide-react';
import { DialogHeader } from '../../../components/ui/dialog.tsx';
import { DialogTitle } from '@radix-ui/react-dialog';

const CreateWorkspace = ({
  types,
  workspace,
  onSuccess
}: {
  types: any[];
  workspace?: WorkspaceItemDto;
  onSuccess: () => void;
}) => {
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  const [workspaceType, setWorkspaceType] = useState(types[0]?.name || '');

  useEffect(() => {
    setWorkspaceType(types[0]?.name || '');
  }, [types]);

  const handleWorkspaceTypeChange = (value: string) => {
    setWorkspaceType(value);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get('name') as string;
    if (!name || !workspace) {
      return;
    }

    updateWorkspace.mutate(
      {
        id: workspace!.id,
        workspaceUpdateDto: {
          title: name
        }
      },
      {
        onSuccess: () => {
          onSuccess();
        }
      }
    );
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get('name') as string;

    if (!workspaceType) {
      return;
    }

    createWorkspace.mutate(
      {
        workspaceCreateDto: {
          title: name || undefined,
          configKey: workspaceType
        }
      },
      {
        onSuccess: () => {
          console.log('closing');
          onSuccess();
        }
      }
    );
  };

  const isLoading = createWorkspace.isPending || updateWorkspace.isPending;

  return (
    <div>
      <ErrorSnackbar error={createWorkspace.error} />
      <ErrorSnackbar error={updateWorkspace.error} />

      <div className="my-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg leading-none font-semibold mb-4">
            {workspace ? 'Edit' : 'Add'} Workspace
          </DialogTitle>
        </DialogHeader>
        <div>
          <form onSubmit={workspace ? handleUpdate : handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={workspace?.title ?? ''}
                placeholder={'Enter workspace name (optional)'}
                autoFocus
              />
            </div>

            {!workspace && (
              <div className="space-y-2">
                <Label htmlFor="configKey">Type</Label>
                <Select
                  name="configKey"
                  value={workspaceType}
                  onValueChange={handleWorkspaceTypeChange}
                >
                  <SelectTrigger id="configKey" className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((item: WorkspaceConfigDto) => (
                      <SelectItem key={item.configKey} value={item.configKey}>
                        {item.title ?? item.configKey}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {workspace ? 'Save' : 'Create'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspace;
