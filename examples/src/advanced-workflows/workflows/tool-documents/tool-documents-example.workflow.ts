import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { ReceiptTool } from './tools';

const ToolDocumentsExampleArgsSchema = z
  .object({
    items: z.array(z.object({ name: z.string(), price: z.number() }).strict()).default([
      { name: 'Coffee', price: 3.5 },
      { name: 'Croissant', price: 2.25 },
    ]),
  })
  .strict();

type ToolDocumentsExampleArgs = z.infer<typeof ToolDocumentsExampleArgsSchema>;

@Workflow({
  title: 'Advanced - Tool Documents Example',
  description:
    'A tool that produces a document — it declares the document on its result envelope and the framework saves it.',
  schema: ToolDocumentsExampleArgsSchema,
})
export class ToolDocumentsExampleWorkflow extends BaseWorkflow<ToolDocumentsExampleArgs> {
  constructor(private readonly receiptTool: ReceiptTool) {
    super();
  }

  @Transition({ to: 'end' })
  async createReceipt(state: Record<string, unknown>, ctx: RunContext<ToolDocumentsExampleArgs>) {
    // The workflow saves nothing itself: the receipt document comes from the tool's envelope.
    const result = await this.receiptTool.call({ items: ctx.args.items });

    this.setResult({ total: result.data.total });
  }
}
