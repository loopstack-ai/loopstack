import { describe, expect, it } from 'vitest';
import { SortOrder } from '@loopstack/contracts/enums';
import { workspaceSortBy } from './useFleet.ts';

describe('workspaceSortBy', () => {
  it('breaks ties by title and then id, so a page holds the same workspaces each time', () => {
    expect(workspaceSortBy({ field: 'appName', order: 'DESC' })).toEqual([
      { field: 'appName', order: SortOrder.DESC },
      { field: 'title', order: SortOrder.ASC },
      { field: 'id', order: SortOrder.ASC },
    ]);
  });

  it('does not order by title twice', () => {
    expect(workspaceSortBy({ field: 'title', order: 'DESC' })).toEqual([
      { field: 'title', order: SortOrder.DESC },
      { field: 'id', order: SortOrder.ASC },
    ]);
  });
});
