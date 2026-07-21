import { ToolTestBuilder, createToolTest } from '../test-builder/tool-test-builder.js';

export * from './replay.js';
export * from './run-workflow.js';

/**
 * Build a tool test — the facade verb for testing a single tool's `handle()` behavior.
 *
 * @public
 */
export function testTool(): ToolTestBuilder {
  return createToolTest();
}
