import { describe, expect, it } from 'vitest';
import { resolvePagination } from './pagination.util.js';

describe('resolvePagination', () => {
  it('defaults to the first page (0) and the default limit', () => {
    expect(resolvePagination({}, 100)).toEqual({ skip: 0, take: 100, page: 0, limit: 100 });
  });

  it('computes skip 0-indexed: page 0 and an omitted page are the same page', () => {
    expect(resolvePagination({ page: 0, limit: 20 }, 100)).toEqual({ skip: 0, take: 20, page: 0, limit: 20 });
    expect(resolvePagination({ page: 2, limit: 20 }, 100)).toEqual({ skip: 40, take: 20, page: 2, limit: 20 });
  });

  it('applies the page even when limit is omitted (against the default limit)', () => {
    expect(resolvePagination({ page: 3 }, 100)).toEqual({ skip: 300, take: 100, page: 3, limit: 100 });
  });

  it('reports the actually served page and limit', () => {
    const { page, limit } = resolvePagination({}, 50);
    expect(page).toBe(0);
    expect(limit).toBe(50);
  });
});
