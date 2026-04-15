import { KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkbenchLayout } from '@/features/workbench';
import { SidebarPanel } from '@/features/workbench/components/SidebarPanel';
import { useCreateSecret, useDeleteSecret, useUpdateSecret, useWorkspaceSecrets } from '@/hooks/useSecrets';

interface WorkbenchSecretsPanelProps {
  workspaceId?: string;
}

export function WorkbenchSecretsPanel({ workspaceId }: WorkbenchSecretsPanelProps) {
  const { panelSize, setPanelSize, closePanel } = useWorkbenchLayout();
  const { data: secrets, isLoading } = useWorkspaceSecrets(workspaceId);
  const createSecret = useCreateSecret();
  const updateSecret = useUpdateSecret();
  const deleteSecret = useDeleteSecret();

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = async () => {
    if (!workspaceId || !newKey.trim() || !newValue.trim()) return;
    await createSecret.mutateAsync({
      workspaceId,
      key: newKey.trim(),
      value: newValue,
    });
    setNewKey('');
    setNewValue('');
  };

  const handleUpdate = async (id: string) => {
    if (!workspaceId || !editValue) return;
    await updateSecret.mutateAsync({ workspaceId, id, value: editValue });
    setEditingId(null);
    setEditValue('');
  };

  const handleDelete = async (id: string) => {
    if (!workspaceId) return;
    await deleteSecret.mutateAsync({ workspaceId, id });
  };

  return (
    <SidebarPanel
      icon={<KeyRound className="h-4 w-4" />}
      title="Secrets"
      description="Manage environment variables for this workspace."
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-sm">Loading...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {secrets?.map((secret) => (
                <div key={secret.id} className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2">
                  <div className="flex-1">
                    <div className="font-mono text-sm">{secret.key}</div>
                    <div className="text-muted-foreground text-xs">{secret.hasValue ? 'Value set' : 'No value'}</div>
                  </div>
                  {editingId === secret.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="password"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="New value"
                        className="h-7 w-32 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => void handleUpdate(secret.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingId(null);
                          setEditValue('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingId(secret.id);
                          setEditValue('');
                        }}
                      >
                        Update
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => void handleDelete(secret.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {secrets?.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">No secrets yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3">
          <div className="space-y-2">
            <Label className="text-xs">Add Secret</Label>
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="KEY_NAME"
              className="font-mono text-sm"
            />
            <Input
              type="password"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              className="text-sm"
            />
            <Button
              size="sm"
              className="w-full"
              disabled={!newKey.trim() || !newValue.trim() || createSecret.isPending}
              onClick={() => void handleAdd()}
            >
              {createSecret.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Plus className="mr-1 h-3 w-3" />
              )}
              Add Secret
            </Button>
          </div>
        </div>
      </div>
    </SidebarPanel>
  );
}
