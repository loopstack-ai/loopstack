import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge.tsx';

interface RunItemProps {
  run: any;
  router: any;
}

function RunItem({ run, router }: RunItemProps) {
  const statusColors = {
    completed: 'bg-green-50 text-green-900 border-green-200',
    failed: 'bg-destructive/10 text-destructive border-destructive/20',
    canceled: 'bg-orange-50 text-orange-900 border-orange-200',
    running: 'bg-blue-50 text-blue-900 border-blue-200',
    paused: 'bg-yellow-50 text-yellow-900 border-yellow-200',
    pending: 'bg-muted text-muted-foreground border-border',
  };

  const statusColor =
    statusColors[run.status as keyof typeof statusColors] || 'bg-muted text-muted-foreground border-border';

  return (
    <Link
      to={router.getPipeline(run.id)}
      key={run.id}
      className="bg-card border-border hover:border-primary/50 group block w-full overflow-hidden rounded-lg border p-4 transition-all duration-200 hover:shadow-md"
    >
      <div className="flex min-w-0 items-start justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-foreground group-hover:text-primary truncate font-semibold transition-colors">
            Run #{run.run} {run.title ? `(${run.title})` : ''}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={`rounded-full border px-2 py-1 text-xs whitespace-nowrap ${statusColor}`}>
              {run.status}
            </Badge>
            <span className="text-muted-foreground text-xs">{new Date(run.updatedAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="ml-3 opacity-0 transition-opacity group-hover:opacity-100">
          <svg className="text-muted-foreground h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default RunItem;
