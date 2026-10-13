import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { resolveDocumentName } from '@loopstack/core';
import { ReceiptDocument } from '../documents/receipt-document';
import type { ReceiptDocumentType } from '../documents/receipt-document';

const ReceiptItemSchema = z.object({ name: z.string(), price: z.number() }).strict();

const ReceiptSchema = z
  .object({
    items: z.array(ReceiptItemSchema),
  })
  .strict();

type ReceiptArgs = z.infer<typeof ReceiptSchema>;

export const ReceiptToolResultSchema = z.object({ total: z.number() }).strict();

export type ReceiptToolResult = z.infer<typeof ReceiptToolResultSchema>;

/**
 * Produces a document without writing it. `handle()` returns the receipt in `documents` on its result envelope, and
 * the tool pipeline saves it after the call — after any interceptor or replay — so a replayed call saves the same
 * document a live call does.
 */
@Tool({
  name: 'create_receipt',
  description: 'Totals a list of items and declares a receipt document for them.',
  schema: ReceiptSchema,
  resultSchema: ReceiptToolResultSchema,
  effects: 'none',
})
export class ReceiptTool extends BaseTool<ReceiptArgs, object, ReceiptToolResult> {
  protected async handle(args: ReceiptArgs): Promise<ToolEnvelope<ReceiptToolResult>> {
    const total = args.items.reduce((sum, item) => sum + item.price, 0);
    const lines = args.items.map((item) => `| ${item.name} | ${item.price.toFixed(2)} |`);
    const receipt: ReceiptDocumentType = {
      markdown: ['| Item | Price |', '| --- | ---: |', ...lines, `| **Total** | **${total.toFixed(2)}** |`].join('\n'),
    };

    return Promise.resolve({
      data: { total },
      // The registered @Document name ('receipt'), its content, and the same options as documentStore.save().
      documents: [
        { documentName: resolveDocumentName(ReceiptDocument), content: receipt, options: { key: 'receipt' } },
      ],
    });
  }
}
