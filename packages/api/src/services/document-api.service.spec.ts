import { FindOperator } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { buildDocumentWhere } from './document-api.service.js';

describe('buildDocumentWhere', () => {
  it('matches plain fields by equality', () => {
    expect(buildDocumentWhere({ workflowId: 'wf-1', isInvalidated: false })).toEqual({
      workflowId: 'wf-1',
      isInvalidated: false,
    });
  });

  it('turns updatedAfter into a range, so a client can ask only for what changed', () => {
    const where = buildDocumentWhere({ workflowId: 'wf-1', updatedAfter: '2026-09-18T08:00:00.000Z' });

    expect(where.workflowId).toBe('wf-1');
    expect(where.updatedAfter).toBeUndefined();
    const updatedAt = where.updatedAt as FindOperator<Date>;
    expect(updatedAt.type).toBe('moreThan');
    expect(updatedAt.value).toEqual(new Date('2026-09-18T08:00:00.000Z'));
  });

  it('turns beforeIndex into a range, so history is walked backwards a page at a time', () => {
    const where = buildDocumentWhere({ workflowId: 'wf-1', beforeIndex: 42 });

    expect(where.beforeIndex).toBeUndefined();
    const index = where.index as FindOperator<number>;
    expect(index.type).toBe('lessThan');
    expect(index.value).toBe(42);
  });

  it('is empty without a filter', () => {
    expect(buildDocumentWhere(undefined)).toEqual({});
  });
});
