import RunItem, { type Run } from '@/features/dashboard/RunItem.tsx';
import { ScrollArea } from '../../components/ui/scroll-area.tsx';

interface Router {
  getPipeline: (id: string) => string;
}

interface RunsListProps {
  type: string;
  runs: Run[];
  router: Router;
  emptyMessage: string;
}

function RunsList({ type, runs, router, emptyMessage }: RunsListProps) {
  if (runs.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ScrollArea className="h-75 w-full">
      <div className="space-y-2 pr-2">
        {runs.map((run) => (
          <RunItem key={`${type}-${run.id}`} run={run} router={router} />
        ))}
      </div>
    </ScrollArea>
  );
}

export default RunsList;
