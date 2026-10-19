import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GitRepository } from '../types';

interface GitRepoSelectorProps {
  repos: GitRepository[];
  value: string;
  onChange: (dir: string) => void;
}

/**
 * Picks which repository of the workspace the git panel addresses. Hidden when the workspace holds at most
 * one, which is every workspace that was never told about more.
 *
 * The value is the repository's `dir` — what the endpoints take — and the empty string is the workspace root.
 */
export function GitRepoSelector({ repos, value, onChange }: GitRepoSelectorProps) {
  if (repos.length <= 1) return null;

  return (
    <div className="border-b px-3 py-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Select repository" />
        </SelectTrigger>
        <SelectContent>
          {repos.map((repo) => (
            <SelectItem key={repo.dir} value={repo.dir} className="text-xs">
              <span className="flex items-center gap-2">
                {repo.key}
                {repo.primary && <span className="text-muted-foreground">(primary)</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
