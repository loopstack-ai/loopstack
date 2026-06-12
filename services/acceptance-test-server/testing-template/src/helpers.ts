import { createHmac } from 'node:crypto';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

const LOCAL_DEV_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function localDevToken(): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ sub: LOCAL_DEV_USER_ID, type: 'local', workerId: 'local', roles: [], iat: now, exp: now + 3600 }),
  );
  const signature = createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const AUTH_TOKEN = localDevToken();

interface StartWorkflowResult {
  workflowId: string;
  workspaceId: string;
  status: string;
}

interface WorkflowResult {
  id: string;
  workflowName: string;
  status: string;
  place: string;
  args: Record<string, unknown>;
  context: Record<string, unknown>;
  result: Record<string, unknown> | null;
  availableTransitions: { id: string; from: string; to: string; trigger: string }[] | null;
  hasError: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentResult {
  id: string;
  tag: string;
  data: Record<string, unknown>;
  workflowId: string;
  createdAt: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${APP_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AUTH_TOKEN}`, ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// A workflow can only be started inside a workspace bound to its @StudioApp. We create one lazily
// (using the first registered app) and reuse it, so tests just call startWorkflow(name, args).
let cachedWorkspaceId: string | undefined;

async function ensureWorkspace(): Promise<string> {
  if (cachedWorkspaceId) return cachedWorkspaceId;
  const apps = await request<{ appName: string }[]>('/api/v1/config/apps');
  if (!apps.length) {
    throw new Error('No @StudioApp is registered in the app under test — a workflow must be declared in one.');
  }
  const workspace = await request<{ id: string }>('/api/v1/workspaces', {
    method: 'POST',
    body: JSON.stringify({ appName: apps[0].appName, title: 'acceptance-test' }),
  });
  cachedWorkspaceId = workspace.id;
  return cachedWorkspaceId;
}

export async function startWorkflow(
  workflowName: string,
  args?: Record<string, unknown>,
): Promise<StartWorkflowResult> {
  const workspaceId = await ensureWorkspace();
  return request<StartWorkflowResult>('/api/v1/processor/start', {
    method: 'POST',
    body: JSON.stringify({ workflowName, workspaceId, args }),
  });
}

export async function getWorkflow(workflowId: string): Promise<WorkflowResult> {
  return request<WorkflowResult>(`/api/v1/workflows/${workflowId}`);
}

export async function pollUntilComplete(
  workflowId: string,
  options?: { timeout?: number; interval?: number },
): Promise<WorkflowResult> {
  const timeout = options?.timeout ?? 120_000;
  const interval = options?.interval ?? 1_000;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const workflow = await getWorkflow(workflowId);
    if (workflow.status === 'completed' || workflow.status === 'failed') {
      return workflow;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Workflow ${workflowId} did not complete within ${timeout}ms`);
}

export async function resumeTransition(
  workflowId: string,
  transitionId: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await request(`/api/v1/processor/run/${workflowId}`, {
    method: 'POST',
    body: JSON.stringify({ transition: { id: transitionId, payload } }),
  });
}

export async function getDocuments(workflowId: string): Promise<DocumentResult[]> {
  // The documents endpoint takes a JSON-encoded `filter` param; a bare `?workflowId=` is ignored.
  const filter = encodeURIComponent(JSON.stringify({ workflowId }));
  const result = await request<{ data: DocumentResult[] }>(`/api/v1/documents?filter=${filter}`);
  return result.data;
}

export function scrub(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj), (key, value) => {
    if (['id', 'runId', 'workflowId', 'workspaceId', 'parentId', 'createdBy'].includes(key)) {
      return `<${key}>`;
    }
    if (['createdAt', 'updatedAt', 'timestamp'].includes(key)) {
      return '<date>';
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return '<iso-date>';
    }
    return value;
  });
}
