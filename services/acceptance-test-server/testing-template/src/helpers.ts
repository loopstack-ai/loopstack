const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

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
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function startWorkflow(
  workflowName: string,
  args?: Record<string, unknown>,
): Promise<StartWorkflowResult> {
  return request<StartWorkflowResult>('/api/v1/processor/start', {
    method: 'POST',
    body: JSON.stringify({ workflowName, args }),
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
  const result = await request<{ data: DocumentResult[] }>(`/api/v1/documents?workflowId=${workflowId}`);
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
