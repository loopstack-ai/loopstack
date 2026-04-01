import { Final, Initial, InjectDocument, Workflow } from '@loopstack/common';
import { ErrorDocument, MarkdownDocument, MessageDocument, PlainDocument } from '@loopstack/core';

@Workflow({
  uiConfig: __dirname + '/test-ui-documents.workflow.yaml',
})
export class TestUiDocumentsWorkflow {
  @InjectDocument() private errorDocument: ErrorDocument;
  @InjectDocument() private markdownDocument: MarkdownDocument;
  @InjectDocument() private messageDocument: MessageDocument;
  @InjectDocument() private plainDocument: PlainDocument;

  @Initial({ to: 'rendered' })
  async renderAll() {
    // Message
    await this.messageDocument.create({
      content: {
        role: 'assistant',
        content: 'This is the default message',
      },
    });

    // Error
    await this.errorDocument.create({
      content: {
        error: 'This is an error message',
      },
    });

    // Markdown
    await this.markdownDocument.create({
      content: {
        markdown: '# Markdown\n\nThis is `markdown`\n',
      },
    });

    // Plain Text
    await this.plainDocument.create({
      content: {
        text: 'This is plain text',
      },
    });
  }

  @Final({ from: 'rendered' })
  done() {}
}
