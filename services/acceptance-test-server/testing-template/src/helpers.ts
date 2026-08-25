import { createClient } from '@loopstack/client';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

// The app under test runs with auth disabled (Loopstack's default): every request resolves to
// the lazily created local dev user — no token, no seeding, no headers.
const client = createClient({ url: APP_URL });

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
  availableTransitions: { id: string; from: string; to: string; trigger?: string }[] | null;
  hasError: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentResult {
  id: string;
  documentName: string;
  content: Record<string, unknown>;
  meta: Record<string, unknown> | null;
  isInvalidated: boolean;
  index: number;
  tags: string[];
  workflowId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

// A workflow can only be started inside a workspace bound to its @StudioApp. We create one lazily
// (using the first registered app) and reuse it, so tests just call startWorkflow(name, args).
let cachedWorkspaceId: string | undefined;

async function ensureWorkspace(): Promise<string> {
  if (cachedWorkspaceId) return cachedWorkspaceId;
  const apps = await client.config.apps();
  if (!apps.length) {
    throw new Error('No @StudioApp is registered in the app under test — a workflow must be declared in one.');
  }
  const workspace = await client.workspaces.create({ appName: apps[0].appName, title: 'acceptance-test' });
  cachedWorkspaceId = workspace.id;
  return cachedWorkspaceId;
}

export async function startWorkflow(
  workflowName: string,
  args?: Record<string, unknown>,
): Promise<StartWorkflowResult> {
  const workspaceId = await ensureWorkspace();
  const result = await client.processor.start({ workflowName, workspaceId, args });
  return result as StartWorkflowResult;
}

export interface WorkflowInfo {
  workflowName: string;
  title?: string;
  description?: string;
  /** Args JSON-schema (converted from the workflow's zod schema). */
  schema?: Record<string, unknown>;
}

export async function listWorkflows(): Promise<WorkflowInfo[]> {
  const apps = await client.config.apps();
  return apps.flatMap((app) => (app.workflows ?? []) as WorkflowInfo[]);
}

export async function getWorkflowSchema(workflowName: string): Promise<Record<string, unknown> | undefined> {
  const workflows = await listWorkflows();
  return workflows.find((w) => w.workflowName === workflowName)?.schema;
}

export async function getWorkflow(workflowId: string): Promise<WorkflowResult> {
  return (await client.workflows.get(workflowId)) as unknown as WorkflowResult;
}

/** Ids of the currently-available transitions (a transition's id is its name, e.g. `'review'`). */
export async function getTransitions(workflowId: string): Promise<string[]> {
  const workflow = await getWorkflow(workflowId);
  return (workflow.availableTransitions ?? []).map((t) => t.id);
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
  await client.processor.run(workflowId, {
    transition: { id: transitionId, workflowId, payload },
  });
}

export async function getDocuments(workflowId: string): Promise<DocumentResult[]> {
  const page = await client.documents.list({ filter: { workflowId } });
  return page.data as unknown as DocumentResult[];
}

export async function getDocumentNames(workflowId: string): Promise<string[]> {
  const docs = await getDocuments(workflowId);
  return docs.map((d) => d.documentName);
}

export async function hasDocument(workflowId: string, name: string): Promise<boolean> {
  return (await getDocumentNames(workflowId)).includes(name);
}

export interface Message {
  role: string;
  text?: string;
}

/** Collects every string value nested anywhere inside a document's content. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

/** True if `text` appears as any string value in any document — works whatever the app's doc shape. */
export async function hasMessage(workflowId: string, text: string): Promise<boolean> {
  const docs = await getDocuments(workflowId);
  return docs.some((d) => collectStrings(d.content).includes(text));
}

/** Messages as `{ role, text }`, reading either `content.text` or `content.content`. */
export async function getMessages(workflowId: string): Promise<Message[]> {
  const docs = await getDocuments(workflowId);
  const messages: Message[] = [];
  for (const d of docs) {
    const c = d.content;
    const text = typeof c.text === 'string' ? c.text : typeof c.content === 'string' ? c.content : undefined;
    if (text !== undefined) messages.push({ role: String(c.role ?? ''), text });
  }
  return messages;
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
