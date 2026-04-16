import { GitBranch } from 'lucide-react';
import type { GitStatusResponse } from '../api/git';

interface GitBranchBadgeProps {
  status: GitStatusResponse;
}

export function GitBranchBadge({ status }: GitBranchBadgeProps) {
  const changeCount = status.staged.length + status.modified.length + status.untracked.length + status.deleted.length;

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
      <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="font-mono text-sm font-medium">{status.branch}</span>
      {changeCount > 0 && (
        <span className="text-muted-foreground text-xs">
          {changeCount} change{changeCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
