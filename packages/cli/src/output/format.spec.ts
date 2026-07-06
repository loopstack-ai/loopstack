import { describe, expect, it } from 'vitest';
import { renderTable } from './format.js';

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
