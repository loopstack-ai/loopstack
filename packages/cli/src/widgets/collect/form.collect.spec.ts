import { describe, expect, it } from 'vitest';
import { revertReadOnlyChanges } from './form.collect.js';

const OPTIONS = {
  properties: {
    subject: { title: 'Subject', readonly: true },
    comment: { widget: 'textarea' },
  },
};

const ORIGINAL = { subject: 'Loopstack HITL forms', rating: 3, comment: '' };

describe('revertReadOnlyChanges', () => {
  it('reverts edited read-only fields and reports them', () => {
    const { payload, reverted } = revertReadOnlyChanges(
      { subject: 'Hacked subject', rating: 5, comment: 'nice' },
      ORIGINAL,
      OPTIONS,
      undefined,
    );
    expect(payload).toEqual({ subject: 'Loopstack HITL forms', rating: 5, comment: 'nice' });
    expect(reverted).toEqual(['subject']);
  });

  it('passes untouched read-only fields through silently', () => {
    const { payload, reverted } = revertReadOnlyChanges(
      { subject: 'Loopstack HITL forms', rating: 1, comment: 'meh' },
      ORIGINAL,
      OPTIONS,
      undefined,
    );
    expect(payload.rating).toBe(1);
    expect(reverted).toEqual([]);
  });

  it('restores a deleted read-only field', () => {
    const { payload, reverted } = revertReadOnlyChanges({ rating: 4, comment: 'ok' }, ORIGINAL, OPTIONS, undefined);
    expect(payload.subject).toBe('Loopstack HITL forms');
    expect(reverted).toEqual(['subject']);
  });

  it('honors schema-level readonly as the fallback, with widget config winning per field', () => {
    const schema = {
      properties: { locked: { type: 'string', readonly: true }, open: { type: 'string' } },
    };
    const result = revertReadOnlyChanges(
      { locked: 'changed', open: 'changed' },
      { locked: 'v1', open: 'v0' },
      {},
      schema,
    );
    expect(result.payload).toEqual({ locked: 'v1', open: 'changed' });
    expect(result.reverted).toEqual(['locked']);

    const overridden = revertReadOnlyChanges(
      { locked: 'changed' },
      { locked: 'v1' },
      { properties: { locked: { readonly: false } } },
      schema,
    );
    expect(overridden.payload).toEqual({ locked: 'changed' });
    expect(overridden.reverted).toEqual([]);
  });

  it('compares structurally — reordered but equal objects are not reverted', () => {
    const options = { properties: { meta: { readonly: true } } };
    const { reverted } = revertReadOnlyChanges({ meta: { a: 1, b: 2 } }, { meta: { b: 2, a: 1 } }, options, undefined);
    expect(reverted).toEqual([]);
  });
});
