import { useQuery } from '@tanstack/react-query';
import { RefreshCw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider';

interface LogsResponse {
  stdout: string;
  stderr: string;
}

export function WorkbenchLogsPanel() {
  const { closeSidePanel } = useWorkbenchLayout();
  const bottomRef = useRef<HTMLDivElement>(null);

  const base = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000';

  const logsQuery = useQuery({
    queryKey: ['remote-agent-app-logs'],
    queryFn: async (): Promise<LogsResponse> => {
      const res = await fetch(`${base}/api/v1/app/logs?lines=200`, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch logs (${res.status}): ${text}`);
      }
      return (await res.json()) as LogsResponse;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logsQuery.data]);

  return (
    <div className="border-l bg-background flex w-1/2 shrink-0 flex-col">
      <div className="border-b flex h-12 shrink-0 items-center justify-between px-3">
        <span className="text-sm font-medium">Application Logs</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void logsQuery.refetch()}
            className={cn(
              'text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer',
              logsQuery.isFetching && 'animate-spin',
            )}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={closeSidePanel}
            className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {logsQuery.isLoading && !logsQuery.data ? (
          <p className="text-sm text-muted-foreground">Loading logs...</p>
        ) : logsQuery.error ? (
          <p className="text-sm text-destructive">Error: {logsQuery.error.message}</p>
        ) : (
          <div className="space-y-3">
            {logsQuery.data?.stdout && (
              <pre className="text-xs leading-relaxed whitespace-pre-wrap break-all font-mono">
                {logsQuery.data.stdout}
              </pre>
            )}
            {logsQuery.data?.stderr && (
              <pre className="text-xs leading-relaxed whitespace-pre-wrap break-all font-mono text-destructive">
                {logsQuery.data.stderr}
              </pre>
            )}
            {!logsQuery.data?.stdout && !logsQuery.data?.stderr && (
              <p className="text-sm text-muted-foreground">No logs available.</p>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
