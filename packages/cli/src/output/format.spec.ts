import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { renderResult, renderTable } from './format.js';

function captureSink() {
  let text = '';
  const out = new Writable({
    write(chunk, _encoding, callback) {
      text += String(chunk);
      callback();
    },
  });
  return { out, text: () => text };
}

describe('renderTable', () => {
  it('pads columns to the widest cell', () => {
    const table = renderTable(
      ['ID', 'STATUS'],
      [
        ['abc', 'completed'],
        ['a-much-longer-id', 'failed'],
      ],
    );
    const lines = table.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('abc               completed');
    expect(lines[2]).toBe('a-much-longer-id  failed');
  });

  it('handles missing cells', () => {
    const table = renderTable(['A', 'B'], [['x']]);
    expect(table.split('\n')[1]).toBe('x');
  });
});

describe('renderResult', () => {
  it('renders object fields as label lines with the value below, strings raw', () => {
    const { out, text } = captureSink();
    renderResult(out, { response: 'The answer is 714.', count: 2 });
    expect(text()).toContain('response:\nThe answer is 714.\n');
    expect(text()).toContain('count:\n2\n');
  });

  it('renders string results raw below a result label', () => {
    const { out, text } = captureSink();
    renderResult(out, 'plain text');
    expect(text()).toBe('result:\nplain text\n');
  });

  it('prints nothing for empty results', () => {
    const { out, text } = captureSink();
    renderResult(out, null);
    renderResult(out, {});
    renderResult(out, { skipped: null });
    expect(text()).toBe('');
  });
});
