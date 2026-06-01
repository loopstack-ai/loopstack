import { Inject } from '@nestjs/common';
import {
  BaseWorkflow,
  DOCUMENT_STORE,
  ErrorDocument,
  Final,
  Initial,
  MarkdownDocument,
  MessageDocument,
  PlainDocument,
  Workflow,
} from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';

interface TestUiDocumentsState {}

@Workflow({
  uiConfig: __dirname + '/test-ui-documents.ui.yaml',
})
export class TestUiDocumentsWorkflow extends BaseWorkflow<Record<string, unknown>, TestUiDocumentsState> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  @Initial({ to: 'rendered' })
  async renderAll(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: TestUiDocumentsState,
  ): Promise<TestUiDocumentsState> {
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

  @Final({ from: 'rendered' })
  async done(ctx: WorkflowContext, state: TestUiDocumentsState): Promise<unknown> {
    return {};
  }
}
