import { describe, expect, it } from 'vitest';
import { parseShortStat } from '../short-stat.js';

describe('parseShortStat', () => {
  it('reads the three numbers', () => {
    expect(parseShortStat(' 3 files changed, 40 insertions(+), 2 deletions(-)\n')).toEqual({
      files: 3,
      insertions: 40,
      deletions: 2,
    });
  });

  it('reads the singular forms and the parts git leaves out', () => {
    expect(parseShortStat(' 1 file changed, 1 insertion(+)')).toEqual({ files: 1, insertions: 1, deletions: 0 });
    expect(parseShortStat(' 1 file changed, 1 deletion(-)')).toEqual({ files: 1, insertions: 0, deletions: 1 });
    expect(parseShortStat('')).toEqual({ files: 0, insertions: 0, deletions: 0 });
  });
});
