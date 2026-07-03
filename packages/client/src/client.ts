import { createHttpClient } from './http.js';
import type { HttpClient, LoopstackClientConfig } from './http.js';
import { createQueries } from './queries/query-options.js';
import type { LoopstackQueries } from './queries/query-options.js';
import { createConfigResource } from './resources/config.js';
import type { ConfigResource } from './resources/config.js';
import { createDashboardResource } from './resources/dashboard.js';
import type { DashboardResource } from './resources/dashboard.js';
import { createDocumentsResource } from './resources/documents.js';
import type { DocumentsResource } from './resources/documents.js';
import { createProcessorResource } from './resources/processor.js';
import type { ProcessorResource } from './resources/processor.js';
import { createWorkflowsResource } from './resources/workflows.js';
import type { WorkflowsResource } from './resources/workflows.js';
import { createWorkspacesResource } from './resources/workspaces.js';
import type { WorkspacesResource } from './resources/workspaces.js';
import { LoopstackStream } from './stream/stream.js';

export interface LoopstackClient {
  /** Cache-scoping key derived from the environment (see {@link LoopstackClientConfig.envKey}). */
  envKey: string;
  http: HttpClient;
  workflows: WorkflowsResource;
  documents: DocumentsResource;
  processor: ProcessorResource;
  workspaces: WorkspacesResource;
  config: ConfigResource;
  dashboard: DashboardResource;
  queries: LoopstackQueries;
  /**
   * The live event stream. Lazy: no connection is opened until the first
   * subscriber attaches (`on`, `onAny`, or `events()`).
   */
  stream: LoopstackStream;
}

export function createClient(config: LoopstackClientConfig): LoopstackClient {
  const envKey = config.envKey ?? config.url;
  const http = createHttpClient(config);
  const workflows = createWorkflowsResource(http);
  const documents = createDocumentsResource(http);
  const processor = createProcessorResource(http);
  const workspaces = createWorkspacesResource(http);
  const configResource = createConfigResource(http);
  const dashboard = createDashboardResource(http);

  return {
    envKey,
    http,
    workflows,
    documents,
    processor,
    workspaces,
    config: configResource,
    dashboard,
    queries: createQueries({ envKey, workflows, documents, workspaces, config: configResource, dashboard }),
    stream: new LoopstackStream(config),
  };
}
