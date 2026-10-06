import { describe, expect, it } from 'vitest';
import { JsonbTransformer, sanitizeForJsonb } from '../jsonb-sanitizer.js';

// Written this way, not as an escape, because prettier folds U+0000 into a raw control byte in source.
const NUL = String.fromCharCode(0);
const REPLACEMENT = String.fromCharCode(0xfffd);
const HIGH = String.fromCharCode(0xd800);
const LOW = String.fromCharCode(0xdc00);

describe('sanitizeForJsonb', () => {
  it('drops U+0000 from a nested string', () => {
    const value = { blocks: [{ type: 'tool_result', content: `before${NUL}${NUL}after` }] };

    expect(sanitizeForJsonb(value)).toEqual({ blocks: [{ type: 'tool_result', content: 'beforeafter' }] });
  });

  it('hands back the very same value when there is nothing to remove', () => {
    const value = { blocks: [{ type: 'text', text: 'ordinary 🎉 text' }] };

    // Reference equality, not deep equality: an untouched payload must reach the driver exactly as it
    // would without the scrub, so the ordinary path carries no risk of a changed shape.
    expect(sanitizeForJsonb(value)).toBe(value);
  });

  it('keeps valid surrogate pairs but replaces lone ones', () => {
    expect(sanitizeForJsonb('emoji 🎉 kept')).toBe('emoji 🎉 kept');
    expect(sanitizeForJsonb(`high ${HIGH} alone`)).toBe(`high ${REPLACEMENT} alone`);
    expect(sanitizeForJsonb(`low ${LOW} alone`)).toBe(`low ${REPLACEMENT} alone`);
    expect(sanitizeForJsonb(`${HIGH}${HIGH}${LOW}`)).toBe(`${REPLACEMENT}${HIGH}${LOW}`);
  });

  it('scrubs object keys as well as values', () => {
    const result = sanitizeForJsonb({ [`bad${NUL}key`]: 'value' });

    expect(Object.keys(result)).toEqual(['badkey']);
  });

  it('reaches into class instances, such as a stored validation error', () => {
    class ValidationError {
      constructor(public message: string) {}
    }

    const result = sanitizeForJsonb({ error: new ValidationError(`rejected ${NUL} value`) });

    expect(result.error.message).toBe('rejected  value');
  });

  it('follows toJSON, which is what the driver will serialize', () => {
    const value = { at: { toJSON: () => `stamp${NUL}ed` } };

    expect(sanitizeForJsonb(value)).toEqual({ at: 'stamped' });
  });

  it('leaves primitives and null alone', () => {
    expect(sanitizeForJsonb(null)).toBeNull();
    expect(sanitizeForJsonb(42)).toBe(42);
    expect(sanitizeForJsonb(false)).toBe(false);
    expect(sanitizeForJsonb(undefined)).toBeUndefined();
  });

  it('produces JSON that Postgres can store, for the payload that broke a run', () => {
    // The shape that failed: a Claude Code tool_result whose 2 KB preview of a 21 MB vitest diff was
    // almost entirely NUL bytes. jsonb cannot hold a single one of them.
    const content = `+ "content": "${NUL.repeat(1941)}"`;
    const document = { role: 'user', blocks: [{ type: 'tool_result', toolCallId: 'toolu_01Q7', content }] };

    const serialized = JSON.stringify(sanitizeForJsonb(document));

    expect(content).toContain(NUL);
    expect(serialized).not.toContain('\\u0000');
    expect(JSON.parse(serialized).blocks[0].content).toBe('+ "content": ""');
  });
});

describe('JsonbTransformer', () => {
  const transformer = new JsonbTransformer();

  it('scrubs on the way to the column', () => {
    expect(transformer.to({ text: `a${NUL}b` })).toEqual({ text: 'ab' });
  });

  it('reads back untouched', () => {
    const stored = { text: 'ab' };

    expect(transformer.from(stored)).toBe(stored);
  });
});
