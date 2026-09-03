import { describe, expect, it } from 'vitest';
import type { DocumentItemInterface } from '@loopstack/contracts/api';
import { composeTranscript } from './transcript.ts';

let counter = 0;
const doc = (over: Partial<DocumentItemInterface> & { workflowId: string }): DocumentItemInterface =>
  ({
    id: `doc-${++counter}`,
    documentName: 'message',
    content: { text: 'hi' },
    createdAt: new Date(2026, 0, 1, 0, 0, counter).toISOString(),
    index: counter,
    place: 'start',
    isInvalidated: false,
    ...over,
  }) as DocumentItemInterface;

const widgets = new Map([
  ['message', 'message'],
  ['link', 'link'],
  ['ask_user', 'text-prompt'],
]);
const resolve = (name: string) => widgets.get(name);

describe('composeTranscript', () => {
  it('merges all nodes chronologically by createdAt, then index', () => {
    const first = doc({ workflowId: 'root' });
    const second = doc({ workflowId: 'root' });
    const between = doc({
      workflowId: 'root',
      createdAt: first.createdAt,
      index: first.index - 0.5,
    });
    const entries = composeTranscript([{ workflowId: 'root', depth: 0, documents: [second, first, between] }], resolve);
    expect(entries.map((entry) => entry.document.id)).toEqual([between.id, first.id, second.id]);
  });

  it('reveals child output only after a link document names it — hidden children stay suppressed', () => {
    const link = doc({ workflowId: 'root', documentName: 'link', content: { workflowId: 'child-a' } });
    const childDoc = doc({ workflowId: 'child-a' });
    const hiddenDoc = doc({ workflowId: 'child-b' });
    const entries = composeTranscript(
      [
        { workflowId: 'root', depth: 0, documents: [link] },
        { workflowId: 'child-a', depth: 1, documents: [childDoc] },
        { workflowId: 'child-b', depth: 1, documents: [hiddenDoc] }, // no link → show: 'hidden'
      ],
      resolve,
    );
    expect(entries.map((entry) => entry.document.id)).toEqual([childDoc.id]);
  });

  it('link documents are visibility bookkeeping, not transcript entries', () => {
    const link = doc({ workflowId: 'root', documentName: 'link', content: { workflowId: 'child' } });
    const entries = composeTranscript([{ workflowId: 'root', depth: 0, documents: [link] }], resolve);
    expect(entries).toEqual([]);
  });

  it('includes re-saved (invalidated) documents — the CLI renders them as honest output', () => {
    const superseded = doc({ workflowId: 'root', isInvalidated: true });
    const current = doc({ workflowId: 'root' });
    const entries = composeTranscript([{ workflowId: 'root', depth: 0, documents: [superseded, current] }], resolve);
    expect(entries).toHaveLength(2);
  });

  it('carries depth and resolved widget on each entry', () => {
    const link = doc({ workflowId: 'root', documentName: 'link', content: { workflowId: 'child' } });
    const prompt = doc({ workflowId: 'child', documentName: 'ask_user' });
    const unknown = doc({ workflowId: 'root', documentName: 'no_config' });
    const entries = composeTranscript(
      [
        { workflowId: 'root', depth: 0, documents: [link, unknown] },
        { workflowId: 'child', depth: 1, documents: [prompt] },
      ],
      resolve,
    );
    expect(entries.find((entry) => entry.document.id === prompt.id)).toMatchObject({ depth: 1, widget: 'text-prompt' });
    expect(entries.find((entry) => entry.document.id === unknown.id)?.widget).toBeUndefined();
  });
});
