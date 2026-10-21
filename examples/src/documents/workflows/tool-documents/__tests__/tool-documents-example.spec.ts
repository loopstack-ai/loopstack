import { describe, expect, it } from 'vitest';
import { replay, runWorkflow } from '@loopstack/testing';
import { ToolDocumentsExampleWorkflow } from '../tool-documents-example.workflow';
import { ReceiptTool } from '../tools';

const ITEMS = [
  { name: 'Coffee', price: 3.5 },
  { name: 'Croissant', price: 2.25 },
];

describe('ToolDocumentsExampleWorkflow', () => {
  it('saves the receipt the tool declares on its envelope', async () => {
    const run = await runWorkflow(ToolDocumentsExampleWorkflow, { items: ITEMS }, { providers: [ReceiptTool] });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ total: 5.75 });
    // The workflow never saves a document — the pipeline saved the tool's declaration.
    expect(run.document('receipt')).toEqual({
      markdown: [
        '| Item | Price |',
        '| --- | ---: |',
        '| Coffee | 3.50 |',
        '| Croissant | 2.25 |',
        '| **Total** | **5.75** |',
      ].join('\n'),
    });
  });

  it('saves the documents of a replayed envelope like a live call', async () => {
    const run = await runWorkflow(
      ToolDocumentsExampleWorkflow,
      { items: ITEMS },
      {
        providers: [ReceiptTool],
        replay: replay({
          version: 3,
          recordings: [
            {
              tool: 'create_receipt',
              transition: 'createReceipt',
              args: { items: ITEMS },
              envelope: {
                data: { total: 99 },
                documents: [{ documentName: 'receipt', content: { markdown: 'Recorded receipt' } }],
              },
            },
          ],
        }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ total: 99 });
    // The recorded declaration was saved, not the one the live tool would have built.
    expect(run.document('receipt')).toEqual({ markdown: 'Recorded receipt' });
  });
});
