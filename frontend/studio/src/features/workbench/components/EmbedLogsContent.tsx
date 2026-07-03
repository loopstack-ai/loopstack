import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, ScrollText } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import config from '../../../config';

interface LogsResponse {
  stdout: string;
  stderr: string;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function LogLine({ line, index }: { line: string; index: number }) {
  const clean = stripAnsi(line);
  const isError = /\bERROR\b/.test(clean);
  const isWarn = /\bWARN\b/.test(clean) || /\b(Warning|WARNING|DeprecationWarning)\b/.test(clean);

  return (
    <div
      className={`group border-border/30 hover:bg-accent/30 flex border-b ${
        isError ? 'bg-destructive/5' : isWarn ? 'bg-yellow-500/5' : ''
      }`}
    >
      <span className="border-border/30 text-muted-foreground/50 w-10 shrink-0 border-r px-2 py-0.5 text-right text-[10px] select-none">
        {index + 1}
      </span>
      <span
        className={`flex-1 px-3 py-0.5 font-mono text-[11px] leading-5 ${
          isError ? 'text-destructive' : isWarn ? 'text-yellow-600 dark:text-yellow-400' : ''
        }`}
      >
        {clean}
      </span>
    </div>
  );
}

export function EmbedLogsContent() {
  const base = config.environment.url;
  const bottomRef = useRef<HTMLDivElement>(null);

  const logsQuery = useQuery({
    queryKey: ['remote-agent-app-logs', base],
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

  const lines = useMemo(() => {
    const parts: string[] = [];
    if (logsQuery.data?.stdout) parts.push(logsQuery.data.stdout);
    if (logsQuery.data?.stderr) parts.push(logsQuery.data.stderr);
    return parts
      .join('\n')
      .split('\n')
      .filter((l) => l.length > 0);
  }, [logsQuery.data]);

  return (
    <div className="flex h-full flex-col">
      <div className="bg-muted/30 flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-muted-foreground text-xs font-medium">Application Logs</span>
        <button
          onClick={() => void logsQuery.refetch()}
          className={`text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors hover:cursor-pointer ${logsQuery.isFetching ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div className="bg-background flex-1 overflow-auto">
        {logsQuery.isLoading && !logsQuery.data ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : logsQuery.error ? (
          <div className="px-4 py-3">
            <p className="text-destructive text-sm">Error: {logsQuery.error.message}</p>
          </div>
        ) : lines.length > 0 ? (
          <div className="font-mono">
            {lines.map((line, i) => (
              <LogLine key={i} line={line} index={i} />
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8">
            <ScrollText className="h-5 w-5" />
            <span className="text-xs">No logs available</span>
          </div>
        )}
      </div>
    </div>
  );
}
