import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

export const DirectRunArgsSchema = z.object({
  text: z.string().default('Loopstack runs this workflow from a plain controller.').describe('Text to count.'),
});
type DirectRunArgs = z.infer<typeof DirectRunArgsSchema>;

@Workflow({
  title: 'Scheduling - Direct Run (Word Count) Example',
  description:
    'The workflow DirectRunController starts with WorkflowRunner.runSync on POST /scheduling-examples/direct-run. Counts the words and characters of a text and publishes the counts as its result.',
  schema: DirectRunArgsSchema,
})
export class DirectRunWorkflow extends BaseWorkflow<DirectRunArgs> {
  @Transition({ to: 'end' })
  async count(_state: Record<string, unknown>, ctx: RunContext<DirectRunArgs>) {
    const words = ctx.args.text.split(/\s+/).filter(Boolean).length;
    const characters = ctx.args.text.length;
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Counted ${words} words and ${characters} characters.`,
    });
    // The published result is what runSync() returns to the caller.
    this.assignResult({ words, characters });
  }
}
