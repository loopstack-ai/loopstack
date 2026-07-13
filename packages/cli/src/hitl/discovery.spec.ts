import { describe, expect, it } from 'vitest';
import type { LoopstackClient } from '@loopstack/client';
import { fetchDocumentWidgets, findActivePrompt } from './discovery.js';

interface FakeWorkflow {
  id: string;
  status: string;
  place?: string;
  parentId?: string;
  workflowName?: string;
  availableTransitions?: { id: string }[];
}

interface FakeDocument {
  id: string;
  documentName: string;
  workflowId: string;
  place?: string;
  content?: Record<string, unknown> | null;
  isInvalidated?: boolean;
}

interface FakeSetup {
  workflows: FakeWorkflow[];
  documents?: FakeDocument[];
  workflowUi?: Record<string, { widgets: unknown[] }>;
}

const APP_DOCUMENTS = [
  {
    documentName: 'text_prompt',
    ui: { widgets: [{ widget: 'text-prompt', options: { transition: 'userAnswered' } }] },
  },
  {
    documentName: 'approval_form',
    ui: { widgets: [{ widget: 'form', options: { actions: [{ transition: 'approve' }] } }] },
  },
  {
    documentName: 'secret_request',
    ui: { widgets: [{ widget: 'secret-input', options: { transition: 'secretsSubmitted' } }] },
  },
  {
    documentName: 'o_auth_prompt',
    ui: { widgets: [{ widget: 'oauth-prompt', options: { transition: 'exchangeToken' } }] },
  },
  {
    documentName: 'late_form',
    ui: { widgets: [{ widget: 'form', options: { actions: [{ transition: 'approve' }] } }] },
    meta: { enableAtPlaces: ['reviewing'] },
  },
  { documentName: 'status_note', ui: { widgets: [{ widget: 'markdown' }] } },
];

function fakeClient(setup: FakeSetup): LoopstackClient {
  return {
    config: {
      apps: () => Promise.resolve([{ documents: APP_DOCUMENTS }]),
      workflowConfig: (name: string) => Promise.resolve({ ui: setup.workflowUi?.[name] }),
    },
    workflows: {
      get: (id: string) => {
        const workflow = setup.workflows.find((candidate) => candidate.id === id);
        if (!workflow) return Promise.reject(new Error(`unknown workflow ${id}`));
        return Promise.resolve(workflow);
      },
      list: (params: { filter?: { parentId?: string } } = {}) =>
        Promise.resolve({
          data: setup.workflows.filter((workflow) => workflow.parentId === params.filter?.parentId),
        }),
    },
    documents: {
      list: (params: { filter?: { workflowId?: string; place?: string; isInvalidated?: boolean } } = {}) =>
        Promise.resolve({
          data: (setup.documents ?? []).filter(
            (document) =>
              document.workflowId === params.filter?.workflowId &&
              (params.filter?.place === undefined || document.place === params.filter.place) &&
              (params.filter?.isInvalidated === undefined || !!document.isInvalidated === params.filter.isInvalidated),
          ),
        }),
    },
  } as unknown as LoopstackClient;
}

async function discover(setup: FakeSetup) {
  const client = fakeClient(setup);
  const widgets = await fetchDocumentWidgets(client);
  return findActivePrompt(client, 'root', widgets);
}

describe('findActivePrompt', () => {
  it('counts running descendants as active — orchestration waits keep polling', async () => {
    const discovery = await discover({
      workflows: [
        { id: 'root', status: 'waiting', place: 'awaiting_tools', availableTransitions: [{ id: 'callback' }] },
        { id: 'sub', status: 'running', place: 'working', parentId: 'root' },
      ],
    });
    expect(discovery.hasActiveDescendants).toBe(true);
    expect(discovery.prompt?.widget).toBeUndefined();
  });

  it('treats parked descendants as parked, not active (T20)', async () => {
    const discovery = await discover({
      workflows: [
        { id: 'root', status: 'waiting', place: 'awaiting_tools', availableTransitions: [{ id: 'callback' }] },
        {
          id: 'sub',
          status: 'waiting',
          place: 'requesting_secrets',
          availableTransitions: [{ id: 'other' }],
          parentId: 'root',
        },
      ],
    });
    expect(discovery.hasActiveDescendants).toBe(false);
  });

  it('finds a collectable prompt on a waiting descendant', async () => {
    const discovery = await discover({
      workflows: [
        { id: 'root', status: 'waiting', place: 'awaiting_tools', availableTransitions: [{ id: 'callback' }] },
        {
          id: 'sub',
          status: 'waiting',
          place: 'waiting_for_user',
          parentId: 'root',
          availableTransitions: [{ id: 'userAnswered' }],
        },
      ],
      documents: [
        {
          id: 'd1',
          documentName: 'text_prompt',
          workflowId: 'sub',
          place: 'waiting_for_user',
          content: { question: 'Name?' },
        },
      ],
    });
    expect(discovery.prompt?.document?.id).toBe('d1');
    expect(discovery.prompt?.workflow.id).toBe('sub');
    expect(discovery.unsupported).toBeUndefined();
  });

  it('reports a declared-but-unimplemented widget as unsupported instead of hanging', async () => {
    const discovery = await discover({
      workflows: [
        { id: 'root', status: 'waiting', place: 'awaiting_tools', availableTransitions: [{ id: 'callback' }] },
        {
          id: 'sub',
          status: 'waiting',
          place: 'awaiting_auth',
          parentId: 'root',
          availableTransitions: [{ id: 'exchangeToken' }],
        },
      ],
      documents: [
        {
          id: 'd1',
          documentName: 'o_auth_prompt',
          workflowId: 'sub',
          place: 'awaiting_auth',
          content: { provider: 'google', authUrl: 'https://example.test/auth' },
        },
      ],
    });
    expect(discovery.prompt?.document).toBeUndefined();
    expect(discovery.unsupported).toMatchObject({
      widgetName: 'oauth-prompt',
      documentName: 'o_auth_prompt',
      content: { provider: 'google', authUrl: 'https://example.test/auth' },
    });
    expect(discovery.hasActiveDescendants).toBe(false);
  });

  it('finds secret-input as a collectable prompt (T21)', async () => {
    const discovery = await discover({
      workflows: [
        {
          id: 'root',
          status: 'waiting',
          place: 'requesting_secrets',
          availableTransitions: [{ id: 'secretsSubmitted' }],
        },
      ],
      documents: [
        {
          id: 'd1',
          documentName: 'secret_request',
          workflowId: 'root',
          place: 'requesting_secrets',
          content: { variables: [{ key: 'EXAMPLE_API_KEY' }] },
        },
      ],
    });
    expect(discovery.prompt?.widget?.widget).toBe('secret-input');
    expect(discovery.unsupported).toBeUndefined();
  });

  it('ignores documents saved at an earlier place (Studio isDocumentActive)', async () => {
    const discovery = await discover({
      workflows: [
        {
          id: 'root',
          status: 'waiting',
          place: 'second_step',
          availableTransitions: [{ id: 'userAnswered' }],
        },
      ],
      documents: [
        {
          id: 'd1',
          documentName: 'text_prompt',
          workflowId: 'root',
          place: 'first_step',
          content: { question: 'Old question?' },
        },
      ],
    });
    expect(discovery.prompt?.document).toBeUndefined();
  });

  it('honors meta.enableAtPlaces for documents answered in a later place', async () => {
    const discovery = await discover({
      workflows: [{ id: 'root', status: 'waiting', place: 'reviewing', availableTransitions: [{ id: 'approve' }] }],
      documents: [
        {
          id: 'd1',
          documentName: 'late_form',
          workflowId: 'root',
          place: 'drafted',
          content: { markdown: 'Approve?' },
        },
      ],
    });
    expect(discovery.prompt?.document?.id).toBe('d1');
  });

  it('skips widgets whose declared transition is not available (Studio canSubmit)', async () => {
    const discovery = await discover({
      workflows: [{ id: 'root', status: 'waiting', place: 'asked', availableTransitions: [{ id: 'somethingElse' }] }],
      documents: [
        {
          id: 'd1',
          documentName: 'text_prompt',
          workflowId: 'root',
          place: 'asked',
          content: { question: 'Name?' },
        },
      ],
    });
    expect(discovery.prompt?.document).toBeUndefined();
    expect(discovery.unsupported).toBeUndefined();
  });

  it('never treats display-only widgets as prompts or unsupported input', async () => {
    const discovery = await discover({
      workflows: [{ id: 'root', status: 'waiting', place: 'done_note', availableTransitions: [{ id: 'continue' }] }],
      documents: [
        {
          id: 'd1',
          documentName: 'status_note',
          workflowId: 'root',
          place: 'done_note',
          content: { markdown: 'All good.' },
        },
      ],
    });
    expect(discovery.prompt?.document).toBeUndefined();
    expect(discovery.unsupported).toBeUndefined();
  });

  it('finds workflow-level prompt widgets via the registry', async () => {
    const discovery = await discover({
      workflows: [
        {
          id: 'root',
          status: 'waiting',
          place: 'waiting_for_user',
          workflowName: 'chat_example',
          availableTransitions: [{ id: 'userMessage' }],
        },
      ],
      workflowUi: {
        chat_example: {
          widgets: [
            { widget: 'prompt-input', enabledWhen: ['waiting_for_user'], options: { transition: 'userMessage' } },
          ],
        },
      },
    });
    expect(discovery.prompt?.widget?.widget).toBe('prompt-input');
  });

  it('prefers a collectable prompt elsewhere in the tree over an unsupported one', async () => {
    const discovery = await discover({
      workflows: [
        { id: 'root', status: 'waiting', place: 'parent_wait', availableTransitions: [{ id: 'callback' }] },
        {
          id: 'sub-oauth',
          status: 'waiting',
          place: 'awaiting_auth',
          parentId: 'root',
          availableTransitions: [{ id: 'exchangeToken' }],
        },
        {
          id: 'sub-ask',
          status: 'waiting',
          place: 'waiting_for_user',
          parentId: 'root',
          availableTransitions: [{ id: 'userAnswered' }],
        },
      ],
      documents: [
        {
          id: 'd1',
          documentName: 'o_auth_prompt',
          workflowId: 'sub-oauth',
          place: 'awaiting_auth',
          content: {},
        },
        {
          id: 'd2',
          documentName: 'text_prompt',
          workflowId: 'sub-ask',
          place: 'waiting_for_user',
          content: { question: 'Name?' },
        },
      ],
    });
    expect(discovery.prompt?.document?.id).toBe('d2');
  });

  it('skips answered prompt documents', async () => {
    const discovery = await discover({
      workflows: [{ id: 'root', status: 'waiting', place: 'asked', availableTransitions: [{ id: 'userAnswered' }] }],
      documents: [
        {
          id: 'd1',
          documentName: 'text_prompt',
          workflowId: 'root',
          place: 'asked',
          content: { question: 'Name?', answer: 'Ada' },
        },
      ],
    });
    expect(discovery.prompt?.document).toBeUndefined();
  });
});
