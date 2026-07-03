import { describe, expect, it } from 'vitest';
import { WorkflowState } from '../enums/workflow-state.enum.js';
import {
  ClientMessageSchema,
  isClientMessage,
  isLlmResponseEvent,
  parseClientMessage,
} from './client-message.schema.js';
import type { ClientMessage } from './client-message.schema.js';

const base = { userId: 'user-1', workerId: 'local' };

const validMessages: ClientMessage[] = [
  { ...base, type: 'workflow.created', id: 'wf-1', workflowId: 'wf-1', parentId: 'wf-0' },
  { ...base, type: 'workflow.created', id: 'wf-1', workflowId: 'wf-1' },
  { ...base, type: 'workflow.updated', id: 'wf-1', workflowId: 'wf-1', status: WorkflowState.Running },
  { ...base, type: 'document.created', workflowId: 'wf-1' },
  { ...base, type: 'secret.upserted', workspaceId: 'ws-1' },
  { ...base, type: 'secret.deleted', workspaceId: 'ws-1' },
  { ...base, type: 'git.updated', workspaceId: 'ws-1' },
  { ...base, type: 'llm.response.start', workflowId: 'wf-1', messageId: 'msg-1' },
  { ...base, type: 'llm.response.text_delta', workflowId: 'wf-1', messageId: 'msg-1', delta: 'Hello' },
  { ...base, type: 'llm.response.thinking_delta', workflowId: 'wf-1', messageId: 'msg-1', delta: 'Hmm' },
  {
    ...base,
    type: 'llm.response.tool_call',
    workflowId: 'wf-1',
    messageId: 'msg-1',
    id: 'call-1',
    name: 'read_file',
    args: { path: 'a.ts' },
  },
  {
    ...base,
    type: 'llm.response.done',
    workflowId: 'wf-1',
    messageId: 'msg-1',
    message: {
      role: 'assistant',
      text: 'Hello world',
      blocks: [{ type: 'text', text: 'Hello world' }],
      stopReason: 'end_turn',
    },
  },
  { ...base, type: 'llm.response.error', workflowId: 'wf-1', messageId: 'msg-1', error: 'rate limited' },
  { ...base, type: 'stream.reset' },
];

describe('ClientMessageSchema', () => {
  it.each(validMessages.map((message) => [message.type, message]))('parses %s', (_type, message) => {
    expect(ClientMessageSchema.parse(message)).toEqual(message);
  });

  it('accepts a null userId', () => {
    const parsed = parseClientMessage({ ...base, userId: null, type: 'document.created', workflowId: 'wf-1' });
    expect(parsed.userId).toBeNull();
  });

  it('strips unknown fields', () => {
    const parsed = parseClientMessage({
      ...base,
      type: 'document.created',
      workflowId: 'wf-1',
      eventType: 'legacy-extra',
    });
    expect(parsed).not.toHaveProperty('eventType');
  });

  it('rejects unknown event types', () => {
    expect(isClientMessage({ ...base, type: 'sse.connected' })).toBe(false);
    expect(isClientMessage({ ...base, type: 'workflow.deleted', id: 'wf-1' })).toBe(false);
  });

  it('rejects a missing discriminant', () => {
    expect(isClientMessage({ ...base, workflowId: 'wf-1' })).toBe(false);
  });

  it('rejects missing envelope fields', () => {
    expect(isClientMessage({ type: 'document.created', workflowId: 'wf-1' })).toBe(false);
  });

  it('rejects missing event-specific fields', () => {
    expect(isClientMessage({ ...base, type: 'workflow.updated', id: 'wf-1', workflowId: 'wf-1' })).toBe(false);
    expect(isClientMessage({ ...base, type: 'document.created' })).toBe(false);
    expect(isClientMessage({ ...base, type: 'secret.upserted' })).toBe(false);
    expect(isClientMessage({ ...base, type: 'llm.response.text_delta', workflowId: 'wf-1', messageId: 'm' })).toBe(
      false,
    );
  });

  it('rejects an invalid workflow status', () => {
    expect(
      isClientMessage({ ...base, type: 'workflow.updated', id: 'wf-1', workflowId: 'wf-1', status: 'exploded' }),
    ).toBe(false);
  });

  it('covers every event type emitted by the server', () => {
    const expected = [
      'workflow.created',
      'workflow.updated',
      'document.created',
      'secret.upserted',
      'secret.deleted',
      'git.updated',
      'llm.response.start',
      'llm.response.text_delta',
      'llm.response.thinking_delta',
      'llm.response.tool_call',
      'llm.response.done',
      'llm.response.error',
      'stream.reset',
    ].sort();
    const actual = ClientMessageSchema.options.map((option) => option.shape.type.value).sort();
    expect(actual).toEqual(expected);
  });
});

describe('isLlmResponseEvent', () => {
  it('narrows llm streaming events', () => {
    const message = parseClientMessage({
      ...base,
      type: 'llm.response.text_delta',
      workflowId: 'wf-1',
      messageId: 'msg-1',
      delta: 'Hi',
    });
    expect(isLlmResponseEvent(message)).toBe(true);
  });

  it('excludes non-llm events', () => {
    const message = parseClientMessage({ ...base, type: 'document.created', workflowId: 'wf-1' });
    expect(isLlmResponseEvent(message)).toBe(false);
  });
});
