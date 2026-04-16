import { GitFork, Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '@/components/data-table/ConfirmDialog';
import { Button } from '@/components/ui/button';
import type { GitRemoteResponse } from '../api/git';

interface GitRemoteStatusProps {
  remote: GitRemoteResponse | null | undefined;
  onConnect?: () => void;
  isConnecting?: boolean;
  onRemove?: () => void;
  isRemoving?: boolean;
}

function parseGitHubUrl(url: string): string | null {
  const match = url.match(/github\.com[/:]([^/]+\/[^/.]+)/);
  return match ? match[1] : null;
}

export function GitRemoteStatus({ remote, onConnect, isConnecting, onRemove, isRemoving }: GitRemoteStatusProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!remote) {
    return (
      <div className="space-y-2">
        <div className="text-muted-foreground px-3 py-2 text-sm">No remote configured</div>
        {onConnect && (
          <Button size="sm" variant="outline" className="w-full" onClick={onConnect} disabled={isConnecting}>
            {isConnecting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
            Connect to GitHub
          </Button>
        )}
      </div>
    );
  }

  const repoPath = parseGitHubUrl(remote.url);

  return (
    <>
      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
        <GitFork className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          {repoPath ? (
            <span className="font-mono text-sm">{repoPath}</span>
          ) : (
            <span className="truncate text-sm text-muted-foreground">{remote.url}</span>
          )}
        </div>
        {onRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 shrink-0"
            onClick={() => setConfirmOpen(true)}
            disabled={isRemoving}
          >
            {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </Button>
        )}
      </div>
      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove remote"
        description={`This will disconnect the remote "${remote.name}" (${repoPath ?? remote.url}). The repository on GitHub will not be deleted.`}
        confirmText="Remove"
        variant="destructive"
        onConfirm={() => {
          setConfirmOpen(false);
          onRemove?.();
        }}
      />
    </>
  );
}
