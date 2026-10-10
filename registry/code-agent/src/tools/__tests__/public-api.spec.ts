import { describe, expect, it } from 'vitest';
import * as api from '../../index.js';

describe('@loopstack/code-agent public API', () => {
  it('exports the ExploreTask result schema', () => {
    expect(api.ExploreTaskResultSchema.safeParse('answer').success).toBe(true);
    expect(api.ExploreTaskResultSchema.safeParse(42).success).toBe(false);
  });
});
