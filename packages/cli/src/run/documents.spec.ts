import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import type { LoopstackClient } from '@loopstack/client';
import { createDocumentRenderer, renderDocumentHistory } from './documents.js';
import type { DocumentRendererOptions } from './documents.js';

interface FakeDocument {
  id: string;
  documentName: string;
  content: Record<string, unknown> | null;
  workflowId?: string;
  index?: number;
  createdAt?: string;
}

const withDefaults = (document: FakeDocument, position: number) => ({
  workflowId: 'wf-1',
  index: position,
  createdAt: `2026-07-09T10:00:0${position}.000Z`,
  ...document,
});

/** A client stub serving one app config and one page of documents. */
function fakeClient(documents: FakeDocument[]): LoopstackClient {
  return {
    config: {
      apps: () =>
        Promise.resolve([
          {
            documents: [
              { documentName: 'llm_message', ui: { widgets: [{ widget: 'llm-message' }] } },
              { documentName: 'link', ui: { widgets: [{ widget: 'link' }] } },
              { documentName: 'text_prompt', ui: { widgets: [{ widget: 'text-prompt' }] } },
              { documentName: 'file', ui: { widgets: [{ widget: 'form' }] } },
              {
                documentName: 'approval_form',
                ui: {
                  widgets: [
                    {
                      widget: 'form',
                      options: {
                        properties: { question: { widget: 'markdown-view' } },
                        actions: [{ transition: 'approve' }],
                      },
                    },
                  ],
                },
              },
              { documentName: 'status_message', ui: { widgets: [{ widget: 'message' }] } },
              { documentName: 'fancy_chart', ui: { widgets: [{ widget: 'chart-3d' }] } },
              {
                documentName: 'profile_form',
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', title: 'Full name' },
                    email: { type: 'string', title: 'Email address' },
                    note: { type: 'string' },
                  },
                },
                ui: { widgets: [{ widget: 'form', options: { order: ['email'] } }] },
              },
            ],
          },
        ]),
    },
    documents: {
      list: (params: { filter?: { workflowId?: string } } = {}) =>
        Promise.resolve({
          data: documents
            .map(withDefaults)
            .filter((document) => !params.filter?.workflowId || document.workflowId === params.filter.workflowId),
        }),
    },
    workflows: {
      list: (params: { filter?: { parentId?: string } } = {}) =>
        Promise.resolve({
          data: params.filter?.parentId === 'wf-1' ? [{ id: 'sub-1' }] : [],
        }),
    },
  } as unknown as LoopstackClient;
}

function captureSink() {
  let text = '';
  const out = new Writable({
    write(chunk, _encoding, callback) {
      text += String(chunk);
      callback();
    },
  });
  return { out, text: () => text };
}

async function render(documents: FakeDocument[], options: DocumentRendererOptions = {}, depth = 0): Promise<string> {
  const { out, text } = captureSink();
  await createDocumentRenderer(fakeClient(documents), out, options).onDocument('wf-1', depth);
  return text();
}

describe('createDocumentRenderer', () => {
  it('renders user messages with a role prefix', async () => {
    const output = await render([
      { id: 'd1', documentName: 'llm_message', content: { role: 'user', text: 'What is the weather?' } },
    ]);
    expect(output).toContain('user:\nWhat is the weather?\n');
  });

  it('skips the text of messages that already streamed, but keeps their tool calls', async () => {
    const output = await render(
      [
        {
          id: 'd1',
          documentName: 'llm_message',
          content: {
            id: 'msg-1',
            role: 'assistant',
            text: 'Let me check.',
            blocks: [{ type: 'tool_call', name: 'weather_lookup', args: { city: 'Tokyo' } }],
          },
        },
      ],
      { streamedMessageIds: new Set(['msg-1']) },
    );
    expect(output).not.toContain('Let me check.');
    expect(output).toContain('⚒ weather_lookup {"city":"Tokyo"}\n');
  });

  it('skips tool calls that already rendered live from stream events', async () => {
    const output = await render(
      [
        {
          id: 'd1',
          documentName: 'llm_message',
          content: {
            id: 'msg-1',
            role: 'assistant',
            blocks: [
              { type: 'tool_call', id: 'toolu-1', name: 'live_tool', args: {} },
              { type: 'tool_call', id: 'toolu-2', name: 'late_tool', args: {} },
            ],
          },
        },
      ],
      { streamedToolCallIds: new Set(['toolu-1']) },
    );
    expect(output).not.toContain('live_tool');
    expect(output).toContain('⚒ late_tool {}');
  });

  it('prints re-saved messages whose id did not stream — repeats are honest output', async () => {
    const output = await render(
      [{ id: 'd1', documentName: 'llm_message', content: { role: 'assistant', text: 'Final answer.' } }],
      { streamedMessageIds: new Set(['msg-1']) },
    );
    expect(output).toContain('Final answer.\n');
  });

  it('renders tool results unwrapped, with error marking', async () => {
    const output = await render([
      {
        id: 'd1',
        documentName: 'llm_message',
        content: {
          role: 'user',
          blocks: [
            { type: 'tool_result', content: '"Weather in Tokyo: 22°C"', isError: false },
            { type: 'tool_result', content: '"Division by zero"', isError: true },
          ],
        },
      },
    ]);
    expect(output).toContain('→ Weather in Tokyo: 22°C\n');
    expect(output).toContain('✗ Division by zero\n');
  });

  it('renders link documents via the studio url builder', async () => {
    const output = await render(
      [{ id: 'd1', documentName: 'link', content: { label: 'Subagent', workflowId: 'child-1' } }],
      { studioUrl: (id) => `https://studio.local/workflows/${id}` },
    );
    expect(output).toContain('⧉ Subagent: https://studio.local/workflows/child-1\n');
  });

  it('rails every line of sub-workflow output by nesting depth', async () => {
    const output = await render(
      [
        {
          id: 'd1',
          documentName: 'llm_message',
          content: {
            role: 'user',
            text: 'line one\nline two',
            blocks: [{ type: 'tool_call', name: 'calculator', args: { a: 1 } }],
          },
        },
      ],
      {},
      1,
    );
    expect(output).toBe('\n│ user:\n│ line one\n│ line two\n│ ⚒ calculator {"a":1}\n');
  });

  it('renders form documents as nested key/value lines with code fences stripped', async () => {
    const output = await render([
      {
        id: 'd1',
        documentName: 'file',
        content: {
          filename: 'hello.py',
          code: '```python\nprint("hi")\nprint("bye")\n```',
          meta: { tags: ['a', 'b'] },
        },
      },
    ]);
    expect(output).toBe(
      '\ndocument: file\n  filename: hello.py\n  code:\n  print("hi")\n  print("bye")\n  meta:\n    tags:\n      - a\n      - b\n',
    );
  });

  it('orders and labels form fields like Studio (schema order, options.order, schema titles)', async () => {
    const output = await render([
      {
        id: 'd1',
        documentName: 'profile_form',
        content: { note: 'hi', name: 'Ada', email: 'ada@example.com' },
      },
    ]);
    expect(output).toBe('\ndocument: profile_form\n  Email address: ada@example.com\n  Full name: Ada\n  note: hi\n');
  });

  it('renders actionable forms with a Studio answer link', async () => {
    const output = await render(
      [{ id: 'd1', documentName: 'approval_form', content: { question: 'Approve the plan?' } }],
      { studioUrl: (id) => `https://studio.local/workflows/${id}` },
    );
    expect(output).toContain('document: approval_form\n');
    expect(output).toContain('  question:\n  Approve the plan?\n');
    expect(output).toContain('  ⧉ answer in Studio: https://studio.local/workflows/wf-1\n');
  });

  it('skips prompt documents — they belong to the HITL renderer', async () => {
    const output = await render([
      { id: 'd1', documentName: 'text_prompt', content: { question: 'Name?', text: 'Name?' } },
    ]);
    expect(output).toBe('');
  });

  it('renders message-widget documents with a role label', async () => {
    const output = await render([
      { id: 'd1', documentName: 'status_message', content: { role: 'assistant', text: 'All done.' } },
    ]);
    expect(output).toBe('\nassistant:\nAll done.\n');
  });

  it('renders markdown-view fields as labeled blocks inside forms', async () => {
    const output = await render([
      { id: 'd1', documentName: 'approval_form', content: { question: '## Deploy?\n\nProceed now.' } },
    ]);
    expect(output).toContain('document: approval_form\n  question:\n  ## Deploy?\n  \n  Proceed now.\n');
  });

  it('renders unknown widgets as truncated JSON, never editable', async () => {
    const output = await render([
      { id: 'd1', documentName: 'fancy_chart', content: { series: [1, 2, 3], title: 'Growth' } },
    ]);
    expect(output).toContain('document: fancy_chart\n');
    expect(output).toContain('"title": "Growth"');
  });

  it('does not render documents without a declared widget', async () => {
    const output = await render([{ id: 'd1', documentName: 'mystery_doc', content: { text: 'hidden' } }]);
    expect(output).toBe('');
  });

  it('truncates large tool results and points at the full-output file', async () => {
    const output = await render([
      {
        id: 'd1',
        documentName: 'llm_message',
        content: {
          role: 'user',
          blocks: [
            {
              type: 'tool_result',
              content: JSON.stringify({ lines: Array.from({ length: 30 }, (_, i) => `row ${i}`) }, null, 2),
              isError: false,
            },
          ],
        },
      },
    ]);
    expect(output).toContain('… (+');
    expect(output).toContain('full result: ');
    expect(output.split('\n').length).toBeLessThan(15);
  });

  it('suppresses sub-workflow documents until a link makes them visible', async () => {
    const visibleWorkflowIds = new Set<string>();
    const hiddenDoc: FakeDocument = {
      id: 'd1',
      documentName: 'llm_message',
      content: { role: 'assistant', text: 'from a hidden child' },
      workflowId: 'sub-1',
    };
    const { out, text } = captureSink();
    const renderer = createDocumentRenderer(fakeClient([hiddenDoc]), out, { visibleWorkflowIds });

    await renderer.onDocument('sub-1', 1);
    expect(text()).toBe('');

    visibleWorkflowIds.add('sub-1');
    await renderer.onDocument('sub-1', 1);
    expect(text()).toContain('from a hidden child');
  });

  it('marks children visible when their link document renders', async () => {
    const visibleWorkflowIds = new Set<string>();
    const { out } = captureSink();
    const renderer = createDocumentRenderer(fakeClient([]), out, { visibleWorkflowIds });
    await renderer.renderDocument(
      {
        id: 'd1',
        documentName: 'link',
        content: { label: 'Child', workflowId: 'sub-1' },
        workflowId: 'wf-1',
        index: 0,
        createdAt: '2026-07-09T10:00:00.000Z',
      } as never,
      0,
    );
    expect(visibleWorkflowIds.has('sub-1')).toBe(true);
  });
});

describe('renderDocumentHistory', () => {
  it('renders the tree history chronologically, railed by depth, without repeats on follow', async () => {
    const documents: FakeDocument[] = [
      {
        id: 'd1',
        documentName: 'llm_message',
        content: { role: 'user', text: 'first' },
        createdAt: '2026-07-09T10:00:01.000Z',
      },
      {
        id: 'd2',
        documentName: 'llm_message',
        content: { role: 'assistant', text: 'from the sub' },
        workflowId: 'sub-1',
        createdAt: '2026-07-09T10:00:02.000Z',
      },
      {
        id: 'd3',
        documentName: 'llm_message',
        content: { role: 'assistant', text: 'last' },
        createdAt: '2026-07-09T10:00:03.000Z',
      },
    ];
    const client = fakeClient(documents);
    const { out, text } = captureSink();
    const renderer = createDocumentRenderer(client, out);

    await renderDocumentHistory(client, renderer, 'wf-1');
    expect(text()).toBe('\nuser:\nfirst\n\n│ assistant:\n│ from the sub\n\nassistant:\nlast\n');

    // A live follow after the sweep must not repeat what history rendered.
    await renderer.onDocument('wf-1');
    await renderer.onDocument('sub-1', 1);
    expect(text()).toBe('\nuser:\nfirst\n\n│ assistant:\n│ from the sub\n\nassistant:\nlast\n');
  });
});
