import { useQuery } from '@tanstack/react-query';
import { ReactFlowProvider } from '@xyflow/react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronRight, ListOrdered, Loader2, Play, RefreshCw, ScrollText, Workflow } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PipelineInterface, PipelineItemInterface, WorkflowItemInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { Button } from '@/components/ui/button.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { PipelineFlowViewer } from '@/features/debug';
import { NewRunDialog, PipelineHistoryList, WorkflowButtons, WorkflowItem } from '@/features/workbench';
import { useFilterPipelines, usePipeline, usePipelineConfigByName } from '../hooks/usePipelines.ts';
import { useFetchWorkflowsByPipeline } from '../hooks/useWorkflows.ts';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

type PreviewTab = 'output' | 'graph' | 'run-log' | 'logs';

const EMBED_MESSAGE_TYPE = 'loopstack:embed:workflow-completed';
const EMBED_RESIZE_MESSAGE_TYPE = 'loopstack:embed:resize';
const EMBED_NEW_RUN_MESSAGE_TYPE = 'loopstack:embed:new-run';

export default function PreviewWorkbenchPage() {
  const { pipelineId } = useParams<{ pipelineId: string }>();

  const [newRunDialogOpen, setNewRunDialogOpen] = useState(false);

  const handleNewRunSuccess = useCallback((newPipelineId: string) => {
    setNewRunDialogOpen(false);
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: EMBED_NEW_RUN_MESSAGE_TYPE,
          pipelineId: newPipelineId,
        },
        window.location.origin,
      );
    }
  }, []);

  // Empty state: no pipelineId — show "New Run" button + recent runs
  if (!pipelineId) {
    return (
      <PreviewEmptyState
        newRunDialogOpen={newRunDialogOpen}
        onNewRunDialogOpenChange={setNewRunDialogOpen}
        onNewRunSuccess={handleNewRunSuccess}
      />
    );
  }

  return <PreviewWorkbenchContent pipelineId={pipelineId} onNewRunSuccess={handleNewRunSuccess} />;
}

function PreviewWorkbenchContent({
  pipelineId,
  onNewRunSuccess,
}: {
  pipelineId: string;
  onNewRunSuccess: (pipelineId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<PreviewTab>('output');
  const [newRunDialogOpen, setNewRunDialogOpen] = useState(false);

  const fetchPipeline = usePipeline(pipelineId);
  const fetchWorkflows = useFetchWorkflowsByPipeline(pipelineId);
  const workflows = useMemo(() => fetchWorkflows.data ?? [], [fetchWorkflows.data]);
  const notifiedRef = useRef(false);

  const workspaceId = fetchPipeline.data?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);
  const workspaceBlockName = fetchWorkspace.data?.blockName;
  const pipelineBlockName = fetchPipeline.data?.blockName;
  const fetchPipelineConfig = usePipelineConfigByName(workspaceBlockName, pipelineBlockName);

  // Notify parent when all workflows have completed
  useEffect(() => {
    if (!fetchWorkflows.data || notifiedRef.current) return;

    const allCompleted =
      fetchWorkflows.data.length > 0 && fetchWorkflows.data.every((w) => w.status === WorkflowState.Completed);

    if (allCompleted && window.parent !== window) {
      notifiedRef.current = true;
      window.parent.postMessage(
        {
          type: EMBED_MESSAGE_TYPE,
          pipelineId,
        },
        window.location.origin,
      );
    }
  }, [fetchWorkflows.data, pipelineId]);

  // Report content height to parent for dynamic iframe sizing
  useEffect(() => {
    if (window.parent === window || !containerRef.current) return;

    const postHeight = () => {
      if (!containerRef.current) return;
      const height = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
      );
      window.parent.postMessage(
        {
          type: EMBED_RESIZE_MESSAGE_TYPE,
          pipelineId,
          height,
        },
        window.location.origin,
      );
    };

    const observer = new ResizeObserver(postHeight);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pipelineId]);

  const handleNewRunSuccess = useCallback(
    (newPipelineId: string) => {
      setNewRunDialogOpen(false);
      onNewRunSuccess(newPipelineId);
    },
    [onNewRunSuccess],
  );

  const scrollTo = () => {};

  const settings = {
    enableDebugMode: false,
    showFullMessageHistory: false,
  };

  const tabs: { value: PreviewTab; label: string; icon: React.ReactNode }[] = [
    { value: 'output', label: 'Output', icon: <ScrollText className="h-3.5 w-3.5" /> },
    { value: 'graph', label: 'Graph', icon: <Workflow className="h-3.5 w-3.5" /> },
    { value: 'run-log', label: 'Run Log', icon: <ListOrdered className="h-3.5 w-3.5" /> },
    { value: 'logs', label: 'Logs', icon: <ScrollText className="h-3.5 w-3.5" /> },
    // { value: 'navigate', label: 'Navigate', icon: <Navigation className="h-3.5 w-3.5" /> },
  ];

  return (
    <div ref={containerRef} className="flex h-screen flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-muted/50 flex h-11 shrink-0 items-center justify-between border-b px-3">
        <div className="bg-background flex items-center rounded-md border p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => setNewRunDialogOpen(true)}>
          <Play className="h-3 w-3" />
          New Run
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <ErrorSnackbar error={fetchPipeline.error} />
        <ErrorSnackbar error={fetchWorkflows.error} />

        {activeTab === 'output' && (
          <div className="px-4 py-3">
            <LoadingCentered loading={fetchPipeline.isLoading || fetchWorkflows.isLoading}>
              {fetchPipeline.data && fetchWorkflows.data
                ? fetchWorkflows.data.map((workflow) => (
                    <EmbedWorkflowSection
                      key={workflow.id}
                      workflow={workflow}
                      pipeline={fetchPipeline.data}
                      collapsible={fetchWorkflows.data.length > 1}
                    >
                      <WorkflowItem
                        pipeline={fetchPipeline.data}
                        workflowId={workflow.id}
                        scrollTo={scrollTo}
                        settings={settings}
                      />
                    </EmbedWorkflowSection>
                  ))
                : null}
            </LoadingCentered>
          </div>
        )}

        {activeTab === 'graph' && (
          <div className="h-full">
            <LoadingCentered loading={fetchPipeline.isLoading || fetchWorkflows.isLoading}>
              {workflows.length > 0 ? (
                <ReactFlowProvider>
                  <PipelineFlowViewer
                    pipelineId={pipelineId}
                    workflows={workflows}
                    pipelineConfig={fetchPipelineConfig.data}
                    direction="TB"
                  />
                </ReactFlowProvider>
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  <p className="text-sm">No workflows found</p>
                </div>
              )}
            </LoadingCentered>
          </div>
        )}

        {activeTab === 'run-log' && (
          <div className="px-4">
            <PipelineHistoryList pipeline={fetchPipeline.data} />
          </div>
        )}

        {activeTab === 'logs' && <EmbedLogsContent />}
      </div>

      <NewRunDialog open={newRunDialogOpen} onOpenChange={setNewRunDialogOpen} onSuccess={handleNewRunSuccess} />
    </div>
  );
}

const STATUS_DOT_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  running: 'bg-blue-500',
  failed: 'bg-red-500',
  paused: 'bg-yellow-500',
  canceled: 'bg-orange-500',
  pending: 'bg-muted-foreground',
};

function PreviewEmptyState({
  newRunDialogOpen,
  onNewRunDialogOpenChange,
  onNewRunSuccess,
}: {
  newRunDialogOpen: boolean;
  onNewRunDialogOpenChange: (open: boolean) => void;
  onNewRunSuccess: (pipelineId: string) => void;
}) {
  const navigate = useNavigate();
  const { router } = useStudio();
  const [limit, setLimit] = useState(3);
  const fetchPipelines = useFilterPipelines(undefined, { parentId: null }, 'createdAt', 'DESC', 0, limit);
  const pipelines = fetchPipelines.data?.data ?? [];
  const total = fetchPipelines.data?.total ?? 0;
  const hasMore = pipelines.length < total;

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => onNewRunDialogOpenChange(true)}>
            <Play className="h-3.5 w-3.5" />
            New Run
          </Button>
        </div>

        {fetchPipelines.isLoading && pipelines.length === 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : pipelines.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium">Recent</p>
            <div className="max-h-[280px] overflow-auto">
              <div className="divide-border divide-y">
                {pipelines.map((pipeline) => (
                  <RecentRunItem
                    key={pipeline.id}
                    pipeline={pipeline}
                    onClick={() => void navigate(router.getPreviewPipeline(pipeline.id))}
                  />
                ))}
              </div>
            </div>
            {hasMore && (
              <button
                className="text-muted-foreground hover:text-foreground mt-2 flex w-full items-center justify-center gap-1 py-1 text-xs transition-colors"
                onClick={() => setLimit((prev) => prev + 5)}
              >
                <ChevronDown className="h-3 w-3" />
                Load more
              </button>
            )}
          </div>
        ) : null}
      </div>

      <NewRunDialog open={newRunDialogOpen} onOpenChange={onNewRunDialogOpenChange} onSuccess={onNewRunSuccess} />
    </div>
  );
}

function RecentRunItem({ pipeline, onClick }: { pipeline: PipelineItemInterface; onClick: () => void }) {
  const dotColor = STATUS_DOT_COLORS[pipeline.status] ?? 'bg-muted-foreground';

  return (
    <button className="hover:bg-accent w-full rounded-md px-2 py-2.5 text-left transition-colors" onClick={onClick}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
        <span className="truncate text-sm font-medium">
          Run #{pipeline.run} &middot; {pipeline.blockName}
        </span>
      </div>
      <p className="text-muted-foreground mt-0.5 pl-3.5 text-xs">
        {pipeline.status} &middot; {formatDistanceToNow(new Date(pipeline.createdAt), { addSuffix: true })}
      </p>
    </button>
  );
}

function EmbedWorkflowSection({
  workflow,
  pipeline,
  collapsible,
  children,
}: {
  workflow: WorkflowItemInterface;
  pipeline: PipelineInterface;
  collapsible: boolean;
  children: React.ReactNode;
}) {
  if (!collapsible) {
    return (
      <div>
        <div className="flex items-center gap-2 p-2 text-sm font-medium">
          <Play className="text-primary h-3.5 w-3.5 fill-current" />
          <span className="flex-1 truncate text-sm">{workflow.title ?? workflow.blockName}</span>
          <WorkflowButtons pipeline={pipeline} workflowId={workflow.id} />
        </div>
        <div className="py-1">{children}</div>
      </div>
    );
  }

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <CollapsibleTrigger asChild>
        <button className="hover:bg-accent hover:text-accent-foreground group/trigger flex w-full items-center gap-2 rounded-md p-2 text-left text-sm font-medium">
          <Play className="text-primary h-3.5 w-3.5 fill-current" />
          <span className="flex-1 truncate text-sm">{workflow.title ?? workflow.blockName}</span>
          <WorkflowButtons pipeline={pipeline} workflowId={workflow.id} />
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="py-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

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
      className={`group flex border-b border-border/30 hover:bg-accent/30 ${
        isError ? 'bg-destructive/5' : isWarn ? 'bg-yellow-500/5' : ''
      }`}
    >
      <span className="w-10 shrink-0 select-none border-r border-border/30 px-2 py-0.5 text-right text-[10px] text-muted-foreground/50">
        {index + 1}
      </span>
      <span
        className={`flex-1 px-3 py-0.5 text-[11px] leading-5 font-mono ${
          isError ? 'text-destructive' : isWarn ? 'text-yellow-600 dark:text-yellow-400' : ''
        }`}
      >
        {clean}
      </span>
    </div>
  );
}

function EmbedLogsContent() {
  const base = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000';
  const bottomRef = useRef<HTMLDivElement>(null);

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
      <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/30 px-3">
        <span className="text-xs font-medium text-muted-foreground">Application Logs</span>
        <button
          onClick={() => void logsQuery.refetch()}
          className={`text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors hover:cursor-pointer ${logsQuery.isFetching ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-background">
        {logsQuery.isLoading && !logsQuery.data ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : logsQuery.error ? (
          <div className="px-4 py-3">
            <p className="text-sm text-destructive">Error: {logsQuery.error.message}</p>
          </div>
        ) : lines.length > 0 ? (
          <div className="font-mono">
            {lines.map((line, i) => (
              <LogLine key={i} line={line} index={i} />
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <ScrollText className="h-5 w-5" />
            <span className="text-xs">No logs available</span>
          </div>
        )}
      </div>
    </div>
  );
}
