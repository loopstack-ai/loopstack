import { BaseWorkflow, Final, Initial, Workflow } from '@loopstack/common';
import { ErrorDocument, MarkdownDocument, MessageDocument, PlainDocument } from '@loopstack/core';

@Workflow({
  uiConfig: __dirname + '/test-ui-documents.workflow.yaml',
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
