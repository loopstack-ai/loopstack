import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

/**
 * Two workflow-level buttons with different place rules, side by side:
 * - "Submit draft" uses `enabledWhen: [drafting]` — outside `drafting` it stays on screen, disabled.
 * - "Approve" uses `showWhen: [in_review]` — outside `in_review` it is not rendered at all.
 */
@Workflow({
  title: 'HITL - Conditional Buttons Example',
  description:
    'enabledWhen vs showWhen: "Submit draft" is disabled outside drafting, ' + '"Approve" is hidden outside in_review.',
  widget: './conditional-buttons-example.ui.yaml',
})
export class ConditionalButtonsExampleWorkflow extends BaseWorkflow {
  @Transition({ to: 'drafting' })
  async startDraft() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text:
        'The draft is open. "Submit draft" is enabled here; "Approve" is hidden until the draft is in review. ' +
        'Click "Submit draft" to continue.',
    });
  }

  @Transition({ from: 'drafting', to: 'in_review', wait: true })
  async submitDraft() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'The draft is in review. "Submit draft" is now disabled, and "Approve" is shown. Click "Approve" to finish.',
    });
  }

  @Transition({ from: 'in_review', to: 'end', wait: true })
  async approve() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'The draft is approved.',
    });
    this.setResult({ approved: true });
  }
}
