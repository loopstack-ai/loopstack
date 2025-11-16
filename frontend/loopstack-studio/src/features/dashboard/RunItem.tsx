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
    pending: 'bg-muted text-muted-foreground border-border'
  };

  const statusColor =
    statusColors[run.status as keyof typeof statusColors] ||
    'bg-muted text-muted-foreground border-border';

  return (
    <Link
      to={router.getPipeline(run.id)}
      key={run.id}
      className="block p-4 bg-card border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all duration-200 group w-full overflow-hidden"
    >
      <div className="flex items-start justify-between min-w-0">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            Run #{run.run} {run.title ? `(${run.title})` : ''}
          </h3>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${statusColor}`}
            >
              {run.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(run.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default RunItem;
