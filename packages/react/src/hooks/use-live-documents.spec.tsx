import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@loopstack/client';
import type { DocumentItemInterface } from '@loopstack/contracts/api';
import { TEST_ENV_KEY, createTestClient, createWrapper } from '../testing/test-utils.js';
import { mergeDocuments, useLiveDocuments } from './use-live-documents.js';

function doc(id: string, index: number, updatedAt: string, content = 'v1'): DocumentItemInterface {
  return { id, index, updatedAt, content, isInvalidated: false } as unknown as DocumentItemInterface;
}

function invalidated(item: DocumentItemInterface, updatedAt: string): DocumentItemInterface {
  return { ...item, updatedAt, isInvalidated: true };
}

/**
 * A retrospective round: the overview and the open problem card, then the delta once the card is decided —
 * both superseded by keyed re-saves (`position: 'keep'`, so they inherit their index), plus the next card.
 */
function keyedResaveRound() {
  const overview = doc('o0', 0, 't1');
  const card = doc('card0', 1, 't1');
  return {
    window: { documents: [overview, card], total: 2 },
    delta: [
      invalidated(overview, 't2'),
      invalidated(card, 't2'),
      doc('decided0', 1, 't2'),
      doc('o1', 0, 't2'),
      doc('card1', 2, 't2'),
    ],
  };
}

describe('mergeDocuments', () => {
  it('appends new documents and keeps display order', () => {
    const window = { documents: [doc('a', 1, 't1')], total: 1 };

    const merged = mergeDocuments(window, [doc('c', 3, 't3'), doc('b', 2, 't2')], 'current');

    expect(merged.documents.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(merged.total).toBe(3);
  });

  it('replaces a re-saved document in place rather than duplicating it', () => {
    const window = { documents: [doc('a', 1, 't1', 'v1')], total: 1 };

    const merged = mergeDocuments(window, [doc('a', 1, 't2', 'v2')], 'current');

    expect(merged.documents).toHaveLength(1);
    expect(merged.documents[0].content).toBe('v2');
    // A replacement is not a new document, so the run's total is unchanged.
    expect(merged.total).toBe(1);
  });

  it('leaves the window untouched when nothing changed', () => {
    const window = { documents: [doc('a', 1, 't1')], total: 1 };
    expect(mergeDocuments(window, [], 'current')).toBe(window);
  });

  it('drops documents superseded by a keyed re-save from a current window', () => {
    const { window, delta } = keyedResaveRound();

    const merged = mergeDocuments(window, delta, 'current');

    // What a fresh 'current' fetch returns: the decided card is no longer in the live view.
    expect(merged.documents.map((item) => item.id)).toEqual(['o1', 'decided0', 'card1']);
    expect(merged.total).toBe(3);
  });

  it('keeps superseded documents in an all window, flagged invalidated', () => {
    const { window, delta } = keyedResaveRound();

    const merged = mergeDocuments(window, delta, 'all');

    expect(merged.documents.map((item) => item.id)).toEqual(['o0', 'o1', 'card0', 'decided0', 'card1']);
    expect(merged.documents.find((item) => item.id === 'card0')?.isInvalidated).toBe(true);
    expect(merged.total).toBe(5);
  });

  it('never adds a document to a current window that was invalidated before it was seen', () => {
    const window = { documents: [doc('a', 0, 't1')], total: 1 };

    const merged = mergeDocuments(window, [invalidated(doc('b', 1, 't2'), 't3'), doc('c', 1, 't3')], 'current');

    expect(merged.documents.map((item) => item.id)).toEqual(['a', 'c']);
    expect(merged.total).toBe(2);
  });
});

describe('useLiveDocuments', () => {
  it('fetches only what changed since the window’s newest row and merges it', async () => {
    const { client, documents, stream } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const queryKey = queryKeys.documents(TEST_ENV_KEY, 'wf-1', 'current');
    queryClient.setQueryData(queryKey, { documents: [doc('a', 1, '2026-09-18T08:00:00.000Z')], total: 1 });
    documents.list.mockResolvedValue({
      data: [doc('b', 2, '2026-09-18T08:00:05.000Z')],
      total: 1,
      page: 0,
      limit: 200,
    });

    renderHook(() => useLiveDocuments({ debounceMs: 0 }), { wrapper });
    stream.emit({ type: 'document.created', workflowId: 'wf-1', userId: 'u', workerId: 'w' });

    await waitFor(() => {
      const window = queryClient.getQueryData<{ documents: DocumentItemInterface[] }>(queryKey);
      expect(window?.documents.map((item) => item.id)).toEqual(['a', 'b']);
    });
    expect(documents.list).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { workflowId: 'wf-1', updatedAfter: '2026-09-18T08:00:00.000Z' },
      }),
    );
  });

  it('takes a document superseded by a keyed re-save off a current window live', async () => {
    const { client, documents, stream } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const queryKey = queryKeys.documents(TEST_ENV_KEY, 'wf-1', 'current');
    const card = doc('card0', 1, '2026-09-18T08:00:00.000Z');
    queryClient.setQueryData(queryKey, { documents: [card], total: 1 });
    documents.list.mockResolvedValue({
      data: [invalidated(card, '2026-09-18T08:00:05.000Z'), doc('decided0', 1, '2026-09-18T08:00:05.000Z')],
      total: 2,
      page: 0,
      limit: 200,
    });

    renderHook(() => useLiveDocuments({ debounceMs: 0 }), { wrapper });
    stream.emit({ type: 'document.created', workflowId: 'wf-1', userId: 'u', workerId: 'w' });

    await waitFor(() => {
      const window = queryClient.getQueryData<{ documents: DocumentItemInterface[] }>(queryKey);
      expect(window?.documents.map((item) => item.id)).toEqual(['decided0']);
    });
  });

  it('keeps syncing while a run writes documents faster than the window', async () => {
    const { client, documents, stream } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const queryKey = queryKeys.documents(TEST_ENV_KEY, 'wf-1', 'current');
    queryClient.setQueryData(queryKey, { documents: [doc('a', 1, '2026-09-18T08:00:00.000Z')], total: 1 });
    documents.list.mockResolvedValue({ data: [], total: 0, page: 0, limit: 200 });

    renderHook(() => useLiveDocuments({ debounceMs: 30 }), { wrapper });
    for (let event = 0; event < 16; event++) {
      stream.emit({ type: 'document.created', workflowId: 'wf-1', userId: 'u', workerId: 'w' });
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    // Asserted while the burst is still running: an agent writing steadily must not be able to
    // postpone the window, which is what left an answered prompt showing pre-click content.
    expect(documents.list.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('ignores runs nobody is displaying', async () => {
    const { client, documents, stream } = createTestClient();
    const { wrapper } = createWrapper(client);

    renderHook(() => useLiveDocuments({ debounceMs: 0 }), { wrapper });
    stream.emit({ type: 'document.created', workflowId: 'wf-unseen', userId: 'u', workerId: 'w' });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(documents.list).not.toHaveBeenCalled();
  });
});
