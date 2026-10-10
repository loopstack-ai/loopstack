import { describe, expect, it } from 'vitest';
import * as api from '../../index.js';

describe('@loopstack/agent public API', () => {
  it('exports the AgentFinishTool result schema', () => {
    expect(api.AgentFinishResultSchema.safeParse({ __agentFinish: true, result: 1 }).success).toBe(true);
    expect(api.AgentFinishResultSchema.safeParse({ result: 1 }).success).toBe(false);
  });
});
