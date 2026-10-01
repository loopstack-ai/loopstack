import { describe, expect, it } from 'vitest';
import type { DocumentEntity, DocumentSaveOptions } from '@loopstack/common';
import { type ExecutionScopeData, RunTraceCollector } from '../../utils/index.js';
import { DocumentPersistenceService } from '../document-persistence.service.js';

/**
 * Where a keyed save puts the new revision. By default it is a new step and goes to the end of the
 * workflow's document list; `position: 'keep'` puts it in the place of the revision it supersedes.
 */
function statelessScope(documents: DocumentEntity[] = []): ExecutionScopeData {
  return {
    userId: 'u1',
    workspaceId: 'ws1',
    workflowId: 'wf1',
    workflowName: 'probe',
    labels: [],
    args: undefined,
    options: { stateless: true },
    cache: new Map(),
    queryRunner: null,
    documents,
    persistenceState: { documentsUpdated: false },
    trace: new RunTraceCollector(),
    tracePersist: false,
    transition: { id: 't1', from: null, to: 'next', payload: {} },
    abortController: new AbortController(),
    stateDraft: {},
    resultDraft: {},
    resultDirty: false,
  };
}

function setup(documents?: DocumentEntity[]) {
  const scope = statelessScope(documents);
  const repo = { create: (data: Partial<DocumentEntity>) => ({ ...data }) as DocumentEntity };
  const service = new DocumentPersistenceService({ get: () => scope } as never, repo as never);
  const save = (name: string, content: Record<string, unknown>, options?: DocumentSaveOptions) =>
    service.create(name, class {}, content, options);
  const live = () =>
    scope.documents
      .filter((d) => !d.isInvalidated)
      .sort((a, b) => a.index - b.index)
      .map((d) => [d.documentName, d.content]);
  return { scope, save, live };
}

describe('DocumentPersistenceService — position of a keyed re-save', () => {
  it('moves a revision to the end by default, past everything written since', async () => {
    const { scope, save, live } = setup();
    const first = await save('gate', { v: 1 }, { key: 'gate' });
    await save('reply', {});
    await save('link', {}, { key: 'link_child' });
    const revised = await save('gate', { v: 2 }, { key: 'gate' });

    expect(live()).toEqual([
      ['reply', {}],
      ['link', {}],
      ['gate', { v: 2 }],
    ]);
    expect(revised.index).toBeGreaterThan(2);
    expect(first.isInvalidated).toBe(true);
    // The superseded revision stays in the cache, so the checkpoint and readers of 'all' still see it.
    expect(scope.documents).toContain(first);
  });

  it("keeps the superseded revision's place with position 'keep'", async () => {
    const { save, live } = setup();
    await save('terminal', { text: 'a' }, { key: 'log' });
    await save('note', {});
    const updated = await save('terminal', { text: 'ab' }, { key: 'log', position: 'keep' });

    expect(updated.index).toBe(0);
    expect(live()).toEqual([
      ['terminal', { text: 'ab' }],
      ['note', {}],
    ]);
  });

  it('keeps the place a revision moved to, not the one it first appeared at', async () => {
    const { save, live } = setup();
    await save('card', { v: 1 }, { key: 'card' });
    await save('note', {});
    const moved = await save('card', { v: 2 }, { key: 'card' });
    const updated = await save('card', { v: 3 }, { key: 'card', position: 'keep' });

    expect(updated.index).toBe(moved.index);
    expect(live()).toEqual([
      ['note', {}],
      ['card', { v: 3 }],
    ]);
  });

  it('gives a moved revision an index no stored document has, invalidated ones included', async () => {
    // A run resumed from the database: every row is loaded, the superseded ones too.
    const stored = [
      { key: 'gate', documentName: 'gate', index: 0, isInvalidated: true },
      { key: 'r', documentName: 'reply', index: 1, isInvalidated: false },
      { key: 'gate', documentName: 'gate', index: 2, isInvalidated: false },
    ] as DocumentEntity[];
    const { scope, save } = setup(stored);
    const revised = await save('gate', { v: 3 }, { key: 'gate' });

    const indexes = scope.documents.map((d) => d.index);
    expect(new Set(indexes).size).toBe(indexes.length);
    expect(revised.index).toBe(3);
    expect(stored[2].isInvalidated).toBe(true);
  });
});
