import { ToolTestBuilder, createToolTest } from '../test-builder/tool-test-builder.js';

export { AnswerQueue, queue } from './answers.js';
export * from './contract-fake.js';
export * from './coverage.js';
export * from './record.js';
export * from './replay.js';
export * from './run-workflow.js';
export * from './trace-diff.js';

/**
 * Build a tool test — the facade verb for testing a single tool's `handle()` behavior.
 *
 * @public
 */
export function testTool(): ToolTestBuilder {
  return createToolTest();
}
