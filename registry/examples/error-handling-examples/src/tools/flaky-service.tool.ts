import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

export type FlakyServiceToolResult = string;

export const FlakyServiceToolResultSchema = z.string();

/**
 * Stands in for an unreliable external service: throws when `shouldFail` is true.
 * The workflows decide per attempt whether it fails, so every error mode is deterministic.
 */
@Tool({
  name: 'flaky_service',
  description: 'Simulates an external service call that fails when shouldFail is true.',
  resultSchema: FlakyServiceToolResultSchema,
  effects: 'none',
})
export class FlakyServiceTool extends BaseTool<{ shouldFail: boolean }, object, FlakyServiceToolResult> {
  protected async handle(args: { shouldFail: boolean }): Promise<ToolEnvelope<FlakyServiceToolResult>> {
    if (args.shouldFail) {
      throw new Error('Simulated external service error');
    }

    return {
      type: 'text',
      data: 'Service call succeeded.',
    };
  }
}
