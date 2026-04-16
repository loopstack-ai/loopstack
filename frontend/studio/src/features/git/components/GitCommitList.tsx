import type { GitCommit } from '../api/git';

interface GitCommitListProps {
  commits: GitCommit[];
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function GitCommitList({ commits }: GitCommitListProps) {
  if (commits.length === 0) {
    return <p className="text-muted-foreground py-4 text-center text-sm">No commits yet.</p>;
  }

  return (
    <div className="space-y-1.5">
      {commits.map((commit) => (
        <div key={commit.hash} className="rounded-md bg-muted/50 px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs text-muted-foreground shrink-0">{commit.shortHash}</span>
            <span className="text-sm leading-tight line-clamp-2">{commit.message}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{commit.author}</span>
            <span>&middot;</span>
            <span>{formatRelativeTime(commit.date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
