import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

@Workflow({
  title: 'Documents - Keep Revision Example',
  description:
    'Keeps a revision live when a later save reuses its key — `meta: { invalidate: false }` protects the revision it is saved with.',
})
export class KeepRevisionExampleWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  async writeAnswers() {
    // Saved with `invalidate: false`: later saves under the key 'answer' leave this revision live.
    await this.documentStore.save(
      MessageDocument,
      { role: 'assistant', text: 'First answer — kept for comparison' },
      { key: 'answer', meta: { invalidate: false } },
    );

    // A normal revision: the next save under the key invalidates it.
    await this.documentStore.save(
      MessageDocument,
      { role: 'assistant', text: 'Draft answer — replaced by the final answer' },
      { key: 'answer' },
    );

    // The latest revision. It invalidates the draft, but not the first answer.
    await this.documentStore.save(MessageDocument, { role: 'assistant', text: 'Final answer' }, { key: 'answer' });
  }
}
