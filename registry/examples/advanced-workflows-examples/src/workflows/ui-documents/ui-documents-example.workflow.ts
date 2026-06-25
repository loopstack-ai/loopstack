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
  title: 'Advanced - UI Documents Example',
  description:
    'Smoke test for the built-in document types — MessageDocument, ErrorDocument, MarkdownDocument, PlainDocument.',
})
export class TestUiDocumentsWorkflow extends BaseWorkflow {
  @Transition({ to: 'rendered' })
  async renderAll(_state: Record<string, unknown>) {
    // Message
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'This is the default message',
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
  }

  @Transition({ from: 'rendered', to: 'end' })
  done(_state: Record<string, unknown>) {}
}
