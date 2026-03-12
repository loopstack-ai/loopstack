import { DialogTitle } from '@radix-ui/react-dialog';
import { Loader2, Star } from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import type { WorkspaceConfigInterface, WorkspaceItemInterface } from '@loopstack/contracts/api';
import ErrorSnackbar from '../../../components/snackbars/ErrorSnackbar.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { DialogHeader } from '../../../components/ui/dialog.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { Label } from '../../../components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select.tsx';
import { useCreateWorkspace, useUpdateWorkspace } from '../../../hooks/useWorkspaces.ts';

export interface CreateWorkspaceProps {
  types: WorkspaceConfigInterface[];
  workspace?: WorkspaceItemInterface;
  onSuccess: () => void;
}

const CreateWorkspace = ({ types, workspace, onSuccess }: CreateWorkspaceProps) => {
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  const [workspaceType, setWorkspaceType] = useState(types[0]?.blockName ?? '');
  const [isFavourite, setIsFavourite] = useState(workspace?.isFavourite ?? false);

  useEffect(() => {
    setWorkspaceType(types[0]?.blockName ?? '');
  }, [types]);

  const handleWorkspaceTypeChange = (value: string) => {
    setWorkspaceType(value);
  };

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
          blockName: workspaceType,
          isFavourite: isFavourite || undefined,
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
              <Label htmlFor="blockName">Type</Label>
              <Select name="blockName" value={workspaceType} onValueChange={handleWorkspaceTypeChange}>
                <SelectTrigger id="blockName" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((item: WorkspaceConfigInterface) => (
                    <SelectItem key={item.blockName} value={item.blockName}>
                      {item.title ?? item.blockName}
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
  );
};

export default CreateWorkspace;
