import { describe, expect, it } from 'vitest';
import type { BaseTool, ToolPipeline, ToolRegistry } from '@loopstack/common';
import { LlmDelegateService } from '../llm-delegate.service.js';

function setup() {
  const tools = { a: { name: 'a' }, b: { name: 'b' } } as unknown as Record<string, BaseTool>;
  const executed: string[] = [];

  const registry = {
    get: (name: string) => {
      const tool = tools[name];
      if (!tool) throw new Error(`Tool "${name}" not registered.`);
      return tool;
    },
  } as unknown as ToolRegistry;

  const pipeline = {
    execute: (tool: { name: string }) => {
      executed.push(tool.name);
      return Promise.resolve({ data: `${tool.name} ran` });
    },
  } as unknown as ToolPipeline;

  return { service: new LlmDelegateService(registry, pipeline), executed };
}

describe('LlmDelegateService.delegateToolCalls', () => {
  const callback = { transition: 'toolResultReceived' };

  it('executes a tool call whose name is in the allowed tools', async () => {
    const { service, executed } = setup();

    const result = await service.delegateToolCalls([{ id: 't1', name: 'a', args: {} }], ['a'], callback);

    expect(executed).toEqual(['a']);
    expect(result.hasErrors).toBe(false);
    expect(result.toolResults).toEqual([
      { type: 'tool_result', toolCallId: 't1', content: JSON.stringify('a ran', null, 2), isError: false },
    ]);
  });

  it('refuses a registered tool that is not in the allowed tools, without executing it', async () => {
    const { service, executed } = setup();

    const result = await service.delegateToolCalls(
      [
        { id: 't1', name: 'a', args: {} },
        { id: 't2', name: 'b', args: {} },
      ],
      ['a'],
      callback,
    );

    expect(executed).toEqual(['a']);
    expect(result.allCompleted).toBe(true);
    expect(result.errors).toEqual([
      { toolName: 'b', toolCallId: 't2', message: expect.stringContaining('not available') },
    ]);
    expect(result.toolResults[1]).toMatchObject({ toolCallId: 't2', isError: true });
    expect(result.toolResults[1].content).toContain('not available');
  });
});
