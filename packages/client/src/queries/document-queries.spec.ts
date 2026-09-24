import { describe, expect, it, vi } from 'vitest';
import type { DocumentItemInterface, PaginatedInterface } from '@loopstack/contracts/api';
import type { DocumentListParams, DocumentsResource } from '../resources/documents.js';
import { DOCUMENT_WINDOW_SIZE, fetchDocumentsBefore, fetchDocumentsSince } from './query-options.js';

function doc(id: string, index: number): DocumentItemInterface {
  return { id, index } as DocumentItemInterface;
}

/** A documents resource that records its list params and replays the given pages. */
function resource(data: DocumentItemInterface[] = []) {
  const calls: DocumentListParams[] = [];
  const list = vi.fn(async (params: DocumentListParams = {}) => {
    calls.push(params);
    return {
      data,
      total: data.length,
      page: 0,
      limit: DOCUMENT_WINDOW_SIZE,
    } as PaginatedInterface<DocumentItemInterface>;
  });
  return { calls, resource: { list, get: vi.fn() } as unknown as DocumentsResource };
}

describe('fetchDocumentsSince', () => {
  it('asks only for what changed, oldest-first', async () => {
    const { calls, resource: documents } = resource([doc('a', 1)]);

    await fetchDocumentsSince(documents, 'wf-1', '2026-09-18T08:00:00.000Z');

    expect(calls[0].filter).toEqual({
      workflowId: 'wf-1',
      isInvalidated: false,
      updatedAfter: '2026-09-18T08:00:00.000Z',
    });
    expect(calls[0].sortBy).toEqual([{ field: 'index', order: 'ASC' }]);
  });

  it('includes re-saved documents in the transcript scope', async () => {
    const { calls, resource: documents } = resource();

    await fetchDocumentsSince(documents, 'wf-1', '2026-09-18T08:00:00.000Z', 'all');

    expect(calls[0].filter).toEqual({ workflowId: 'wf-1', updatedAfter: '2026-09-18T08:00:00.000Z' });
  });
});

describe('fetchDocumentsBefore', () => {
  it('walks backwards a window at a time and returns the page oldest-first', async () => {
    const { calls, resource: documents } = resource([doc('c', 12), doc('b', 11)]);

    const older = await fetchDocumentsBefore(documents, 'wf-1', 13);

    expect(calls[0].filter).toEqual({ workflowId: 'wf-1', isInvalidated: false, beforeIndex: 13 });
    expect(calls[0].sortBy).toEqual([{ field: 'index', order: 'DESC' }]);
    expect(calls[0].limit).toBe(DOCUMENT_WINDOW_SIZE);
    expect(older.map((item) => item.id)).toEqual(['b', 'c']);
  });
});
