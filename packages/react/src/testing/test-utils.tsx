import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { createQueries } from '@loopstack/client';
import type {
  ConfigResource,
  DashboardResource,
  DocumentsResource,
  LoopstackClient,
  WorkflowsResource,
  WorkspacesResource,
} from '@loopstack/client';
import { LoopstackProvider } from '../provider.js';

export const TEST_ENV_KEY = 'env-1';

type StreamHandler = (message: unknown) => void;

export interface MockStream {
  onAny: (handler: StreamHandler) => () => void;
  emit: (message: unknown) => void;
  handlerCount: () => number;
}

/** In-memory stand-in for LoopstackStream — `emit` fans out to every onAny subscriber. */
export function createMockStream(): MockStream {
  const handlers = new Set<StreamHandler>();
  return {
    onAny: (handler: StreamHandler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    emit: (message: unknown) => {
      for (const handler of [...handlers]) handler(message);
    },
    handlerCount: () => handlers.size,
  };
}

function emptyPage(): { data: unknown[]; total: number; page: number; limit: number } {
  return { data: [], total: 0, page: 0, limit: 10 };
}

/**
 * A LoopstackClient built from vi.fn resources and a mock stream, with the
 * real `createQueries` on top so tests exercise the actual key shapes and
 * fetch parameters.
 */
export function createTestClient() {
  const workflows = {
    get: vi.fn(async (id: string) => ({ id, title: 'Workflow' })),
    status: vi.fn(async (id: string) => ({ id, status: 'running' })),
    list: vi.fn(async () => emptyPage()),
    create: vi.fn(async (payload: object) => ({ id: 'wf-created', ...payload })),
    update: vi.fn(async (id: string, payload: object) => ({ id, ...payload })),
    delete: vi.fn(async () => undefined),
    batchDelete: vi.fn(async (ids: string[]) => ({ deleted: ids.length })),
    checkpoints: vi.fn(async () => []),
  };
  const documents = {
    get: vi.fn(async (id: string) => ({ id })),
    list: vi.fn(async () => emptyPage()),
  };
  const processor = {
    start: vi.fn(async () => ({ workflowId: 'wf-started' })),
    run: vi.fn(async () => undefined),
  };
  const workspaces = {
    get: vi.fn(async (id: string) => ({ id, title: 'Workspace' })),
    list: vi.fn(async () => emptyPage()),
    create: vi.fn(async (payload: object) => ({ id: 'ws-created', ...payload })),
    update: vi.fn(async (id: string, payload: object) => ({ id, ...payload })),
    setFavourite: vi.fn(async (id: string, isFavourite: boolean) => ({ id, isFavourite })),
    delete: vi.fn(async () => undefined),
    batchDelete: vi.fn(async (ids: string[]) => ({ deleted: ids, failed: [] })),
  };
  const config = {
    apps: vi.fn(async () => []),
    workflowConfig: vi.fn(async (workflowName: string) => ({ workflowName })),
    workflowSource: vi.fn(async (name: string) => ({ name, filePath: null, raw: null })),
    tools: vi.fn(async () => []),
    tool: vi.fn(async (name: string) => ({ name })),
    availableEnvironments: vi.fn(async () => []),
  };
  const dashboard = {
    stats: vi.fn(async () => ({
      totalAutomationRuns: 0,
      completedRuns: 0,
      errorRuns: 0,
      inProgressRuns: 0,
      recentErrors: [],
      recentRuns: [],
    })),
  };
  const stream = createMockStream();

  const client = {
    envKey: TEST_ENV_KEY,
    http: {},
    workflows,
    documents,
    processor,
    workspaces,
    config,
    dashboard,
    queries: createQueries({
      envKey: TEST_ENV_KEY,
      workflows: workflows as unknown as WorkflowsResource,
      documents: documents as unknown as DocumentsResource,
      workspaces: workspaces as unknown as WorkspacesResource,
      config: config as unknown as ConfigResource,
      dashboard: dashboard as unknown as DashboardResource,
    }),
    stream,
  } as unknown as LoopstackClient;

  return { client, stream, workflows, documents, processor, workspaces, config, dashboard };
}

/** Wrapper mounting QueryClientProvider + LoopstackProvider around a hook under test. */
export function createWrapper(client: LoopstackClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LoopstackProvider client={client}>{children}</LoopstackProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}
