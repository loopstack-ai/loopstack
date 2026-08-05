import { describe, expect, it } from 'vitest';
import type { LlmMessageStreamState } from '@loopstack/client';
import type { DocumentItemInterface } from '@loopstack/contracts/api';
import { mergeStreamingDocuments } from './useTreeLlmStreams.ts';

const stream = (over: Partial<LlmMessageStreamState> = {}): LlmMessageStreamState => ({
  messageId: 'msg-1',
  workflowId: 'wf',
  text: 'Hello wor',
  thinking: '',
  toolCalls: [],
  completed: false,
  ...over,
});

const persisted = (messageId: string): DocumentItemInterface =>
  ({
    id: `doc-${messageId}`,
    documentName: 'llm_message',
    content: { id: messageId, role: 'assistant', text: 'Hello world' },
    isInvalidated: false,
    index: 1,
    place: 'generate',
    createdAt: new Date().toISOString(),
    workflowId: 'wf',
  }) as DocumentItemInterface;

describe('mergeStreamingDocuments', () => {
  it('appends a synthetic document for an in-flight message', () => {
    const merged = mergeStreamingDocuments('wf', 'generate', [], { 'msg-1': stream() });
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      documentName: 'llm_message',
      content: { id: 'msg-1', text: 'Hello wor' },
      meta: { streaming: true },
    });
  });

  it('drops the synthetic document once the persisted message landed', () => {
    const merged = mergeStreamingDocuments('wf', 'generate', [persisted('msg-1')], { 'msg-1': stream() });
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('doc-msg-1');
  });

  it('returns the input untouched when nothing streams', () => {
    const documents = [persisted('msg-9')];
    expect(mergeStreamingDocuments('wf', 'generate', documents, undefined)).toBe(documents);
  });
});
