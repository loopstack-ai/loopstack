import {
  BaseWorkflow,
  ErrorDocument,
  MarkdownDocument,
  MessageDocument,
  PlainDocument,
  Transition,
  Workflow,
} from '@loopstack/common';

@Workflow({
  title: 'Core Ui Documents',
  description: 'Test the displaying of core ui documents',
})
export class TestUiDocumentsWorkflow extends BaseWorkflow {
  @Transition({ to: 'rendered' })
  async renderAll(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Message
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: 'This is the default message',
    });

    // Error
    await this.documentStore.save(ErrorDocument, {
      error: 'This is an error message',
    });

    // Markdown
    await this.documentStore.save(MarkdownDocument, {
      markdown: '# Markdown\n\nThis is `markdown`\n',
    });

    // Plain Text
    await this.documentStore.save(PlainDocument, {
      text: 'This is plain text',
    });
    return state;
  }

  @Transition({ from: 'rendered', to: 'end' })
  async done(_state: Record<string, unknown>): Promise<unknown> {
    return {};
  }
}
