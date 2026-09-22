import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { createQueries } from '@loopstack/client';
import type {
  AuthResource,
  ConfigResource,
  DashboardResource,
  DocumentsResource,
  LoopstackClient,
  WorkflowsResource,
  WorkspacesResource,
} from '@loopstack/client';
import type { StudioDocumentConfig } from '@loopstack/contracts/api';
import { LoopstackProvider } from '@loopstack/react';
import { ThemeProvider } from '@/providers/ThemeProvider.tsx';

export const TEST_ENV_KEY = 'env-1';

/**
 * The slice of a LoopstackClient a rendered Studio widget touches: the app config its document
 * configs come from, and the processor call its buttons make. Everything else stays unstubbed —
 * a widget reaching for it should fail loudly rather than read an empty default.
 */
export function createStudioTestClient(documentConfigs: StudioDocumentConfig[] = []) {
  const config = {
    apps: vi.fn(async () => [{ name: 'test-app', documents: documentConfigs }]),
  };
  const processor = {
    start: vi.fn(async () => ({ workflowId: 'wf-started' })),
    run: vi.fn(async () => undefined),
  };
  const stream = { onAny: () => () => undefined };

  const client = {
    envKey: TEST_ENV_KEY,
    processor,
    config,
    stream,
    queries: createQueries({
      envKey: TEST_ENV_KEY,
      workflows: {} as WorkflowsResource,
      documents: {} as DocumentsResource,
      workspaces: {} as WorkspacesResource,
      config: config as unknown as ConfigResource,
      dashboard: {} as DashboardResource,
      auth: {} as AuthResource,
    }),
  } as unknown as LoopstackClient;

  return { client, processor, config };
}

/**
 * Wrapper mounting the providers a Studio widget renders under: the query client and Loopstack
 * client it reads through, plus the theme every message surface consumes.
 */
export function createStudioWrapper(client: LoopstackClient) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LoopstackProvider client={client}>
        <ThemeProvider>{children}</ThemeProvider>
      </LoopstackProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}
