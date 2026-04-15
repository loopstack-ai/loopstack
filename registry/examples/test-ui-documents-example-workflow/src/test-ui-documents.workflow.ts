import {
  BaseWorkflow,
  ErrorDocument,
  Final,
  Initial,
  MarkdownDocument,
  MessageDocument,
  PlainDocument,
  Workflow,
} from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/test-ui-documents.ui.yaml',
})
export class TestUiDocumentsWorkflow extends BaseWorkflow {
  @Initial({ to: 'rendered' })
  async renderAll() {
    // Message
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: 'This is the default message',
    });

    // Error
    await this.repository.save(ErrorDocument, {
      error: 'This is an error message',
    });

    // Markdown
    await this.repository.save(MarkdownDocument, {
      markdown: '# Markdown\n\nThis is `markdown`\n',
    });

    // Plain Text
    await this.repository.save(PlainDocument, {
      text: 'This is plain text',
    });
  }

  @Final({ from: 'rendered' })
  done() {}
}
