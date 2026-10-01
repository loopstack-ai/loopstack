import { describe, expect, it } from 'vitest';
import type { DocumentItemInterface } from '@loopstack/contracts/api';
import { composeTranscript } from './transcript-model.ts';

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

describe('composeTranscript — a re-saved document is one entry', () => {
  /** A keyed save with `position: 'keep'` writes a new row, marks the old one invalidated, and passes on its index. */
  const revision = (of: DocumentItemInterface, over: Partial<DocumentItemInterface>): DocumentItemInterface =>
    doc({ workflowId: of.workflowId, index: of.index, ...over } as Partial<DocumentItemInterface> & {
      workflowId: string;
    });

  it('draws only the live revision of a streaming card', () => {
    // The tail workflow re-saves its terminal once per poll. Drawing every revision is what produced a
    // list of terminals showing the same command at four different lengths.
    const first = doc({ workflowId: 'root', documentName: 'message', isInvalidated: true, content: { text: 'a' } });
    const second = revision(first, { isInvalidated: true, content: { text: 'ab' } });
    const live = revision(first, { content: { text: 'abc' } });
    const entries = composeTranscript([{ workflowId: 'root', depth: 0, documents: [first, second, live] }], resolve);
    expect(entries).toHaveLength(1);
    expect(entries[0].document.content).toEqual({ text: 'abc' });
  });

  it('keeps the entry where it first appeared, not where it was last written', () => {
    // A revision carries a newer timestamp. Sorting on it would walk a card that is still being written
    // past everything logged while it ran.
    const streaming = doc({ workflowId: 'root', isInvalidated: true, content: { text: 'start' } });
    const after = doc({ workflowId: 'root', content: { text: 'logged while it ran' } });
    const live = revision(streaming, { content: { text: 'finished' } });
    const entries = composeTranscript([{ workflowId: 'root', depth: 0, documents: [streaming, after, live] }], resolve);
    expect(entries.map((entry) => entry.document.content)).toEqual([
      { text: 'finished' },
      { text: 'logged while it ran' },
    ]);
  });

  it('keeps entries of different workflows apart even when their indexes collide', () => {
    const link = doc({ workflowId: 'root', documentName: 'link', content: { workflowId: 'child' } });
    const parent = doc({ workflowId: 'root', index: 7, content: { text: 'parent' } });
    const child = doc({ workflowId: 'child', index: 7, content: { text: 'child' } });
    const entries = composeTranscript(
      [
        { workflowId: 'root', depth: 0, documents: [link, parent] },
        { workflowId: 'child', depth: 1, documents: [child] },
      ],
      resolve,
    );
    expect(entries.map((entry) => entry.document.content)).toEqual([{ text: 'parent' }, { text: 'child' }]);
  });

  it('draws a revision that moved to the end there, and nothing where it was before', () => {
    // A gate shown again after a reply is saved at a new index; the place it left holds only invalidated rows.
    const gate = doc({ workflowId: 'root', isInvalidated: true, content: { text: 'gate v1' } });
    const reply = doc({ workflowId: 'root', content: { text: 'reply' } });
    const revised = doc({ workflowId: 'root', content: { text: 'gate v2' } });
    const entries = composeTranscript([{ workflowId: 'root', depth: 0, documents: [gate, reply, revised] }], resolve);
    expect(entries.map((entry) => entry.document.content)).toEqual([{ text: 'reply' }, { text: 'gate v2' }]);
  });

  it('still reveals a child from the place a link moved away from', () => {
    const stale = doc({
      workflowId: 'root',
      documentName: 'link',
      isInvalidated: true,
      content: { workflowId: 'child' },
    });
    const child = doc({ workflowId: 'child', content: { text: 'from the child' } });
    const moved = doc({ workflowId: 'root', documentName: 'link', content: { workflowId: 'child' } });
    const entries = composeTranscript(
      [
        { workflowId: 'root', depth: 0, documents: [stale, moved] },
        { workflowId: 'child', depth: 1, documents: [child] },
      ],
      resolve,
    );
    expect(entries.map((entry) => entry.document.content)).toEqual([{ text: 'from the child' }]);
  });

  it('still reveals a child when the link document was itself re-saved', () => {
    // Links are keyed too, so a superseded link must not lose the child it revealed.
    const stale = doc({
      workflowId: 'root',
      documentName: 'link',
      isInvalidated: true,
      content: { workflowId: 'child' },
    });
    const live = revision(stale, { documentName: 'link', content: { workflowId: 'child' } });
    const child = doc({ workflowId: 'child', content: { text: 'from the child' } });
    const entries = composeTranscript(
      [
        { workflowId: 'root', depth: 0, documents: [stale, live] },
        { workflowId: 'child', depth: 1, documents: [child] },
      ],
      resolve,
    );
    expect(entries.map((entry) => entry.document.content)).toEqual([{ text: 'from the child' }]);
  });
});
