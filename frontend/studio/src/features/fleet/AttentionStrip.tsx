import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowUpRight, PauseCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudio } from '@/providers/StudioProvider.tsx';
import type { AttentionRow } from './fleet-model.ts';
import { timeInState } from './fleet-presentation.ts';

interface AttentionStripProps {
  rows: AttentionRow[];
}

/**
 * The runs waiting on a person, longest wait first.
 *
 * It repeats what the cards below already say, on purpose: finding the two workspaces that need you
 * otherwise means reading twenty cards. Renders nothing at all when the list is empty — no runs waiting
 * is the good case, and it should not cost the grid any vertical space.
 */
export default function AttentionStrip({ rows }: AttentionStripProps) {
  const { router } = useStudio();

  if (rows.length === 0) return null;

  return (
    <section className="border-border bg-card overflow-hidden rounded-lg border">
      <h2 className="text-muted-foreground flex items-center gap-2 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase">
        <PauseCircle className="size-3.5 text-yellow-600 dark:text-yellow-400" />
        Waiting for you ({rows.length})
      </h2>
      <ul className="divide-y">
        {rows.map(({ workspace, run }) => (
          <li key={run.id}>
            <Link
              to={router.getWorkflow(run.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-muted/50 flex items-center gap-2 px-4 py-2 text-sm transition-colors"
            >
              <span className="w-40 shrink-0 truncate font-medium">{workspace.title}</span>
              <span className="truncate">
                {run.workflowName} <span className="text-muted-foreground">#{run.run}</span>
              </span>
              <span className="text-muted-foreground hidden shrink-0 sm:inline">
                parked at <code className="font-mono text-xs">{run.place}</code>
              </span>
              <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                {timeInState('waiting', formatDistanceToNowStrict(new Date(run.updatedAt)))}
              </span>
              <ArrowUpRight className="text-muted-foreground size-3.5 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
