import { z } from 'zod';
import { BaseWorkflow, Guard, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

interface BatchProcessingState {
  items: string[];
  processed: Array<{ item: string; result: string }>;
  batchIndex: number;
}

const BatchProcessingArgsSchema = z.object({
  totalItems: z.number().int().min(1).default(25),
  batchSize: z.number().int().min(1).default(5),
});

type BatchProcessingArgs = z.infer<typeof BatchProcessingArgsSchema>;

@Workflow({
  title: 'Advanced - Batch Processing Example',
  description:
    'Processes a list of items in fixed-size batches with a state-machine loop. Different from FanOutWorkflow — batches run sequentially, items within a batch can run concurrently. Useful for rate-limited APIs, memory-bounded processing, or quota-constrained operations.',
  schema: BatchProcessingArgsSchema,
})
export class BatchProcessingExampleWorkflow extends BaseWorkflow<BatchProcessingArgs> {
  @Transition({ to: 'batch_ready' })
  setup(_state: BatchProcessingState, ctx: RunContext<BatchProcessingArgs>) {
    const items = Array.from({ length: ctx.args.totalItems }, (_, i) => `item-${i + 1}`);
    this.assignState({ items, processed: [], batchIndex: 0 });
  }

  @Transition({ from: 'batch_ready', to: 'batch_done' })
  async processBatch(state: BatchProcessingState, ctx: RunContext<BatchProcessingArgs>) {
    const start = state.batchIndex * ctx.args.batchSize;
    const batch = state.items.slice(start, start + ctx.args.batchSize);

    const results = await Promise.all(
      batch.map(async (item) => ({
        item,
        result: await this.processItem(item),
      })),
    );

    this.assignState({ processed: [...state.processed, ...results] });
  }

  @Transition({ from: 'batch_done', to: 'batch_ready' })
  @Guard('hasMoreItems')
  nextBatch(state: BatchProcessingState) {
    this.assignState({ batchIndex: state.batchIndex + 1 });
  }

  hasMoreItems(state: BatchProcessingState): boolean {
    return state.processed.length < state.items.length;
  }

  @Transition({ from: 'batch_done', to: 'end', priority: 10 })
  @Guard('allItemsProcessed')
  async finish(state: BatchProcessingState, ctx: RunContext<BatchProcessingArgs>) {
    await this.documentStore.save(MarkdownDocument, {
      markdown: [
        `# Batch Processing Complete`,
        ``,
        `Processed ${state.processed.length} items in batches of ${ctx.args.batchSize}.`,
        ``,
        ...state.processed.slice(0, 10).map((r) => `- ${r.item} → ${r.result}`),
        state.processed.length > 10 ? `\n_(${state.processed.length - 10} more omitted)_` : '',
      ].join('\n'),
    });
  }

  allItemsProcessed(state: BatchProcessingState): boolean {
    return state.processed.length >= state.items.length;
  }

  private async processItem(item: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return `processed:${item}`;
  }
}
