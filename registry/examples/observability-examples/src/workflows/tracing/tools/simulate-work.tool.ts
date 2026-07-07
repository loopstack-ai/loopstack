import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

const SimulateWorkSchema = z.object({
  label: z.string(),
  delayMs: z.number().min(0).max(5000),
});

type SimulateWorkArgs = z.infer<typeof SimulateWorkSchema>;

export interface SimulateWorkToolResult {
  label: string;
  delayMs: number;
}

@Tool({
  name: 'simulate_work',
  description: 'Sleeps for the given duration so interceptors have something to measure.',
  schema: SimulateWorkSchema,
})
export class SimulateWorkTool extends BaseTool<SimulateWorkArgs, object, SimulateWorkToolResult> {
  protected async handle(args: SimulateWorkArgs): Promise<ToolEnvelope<SimulateWorkToolResult>> {
    await new Promise((resolve) => setTimeout(resolve, args.delayMs));
    return { data: { label: args.label, delayMs: args.delayMs } };
  }
}
