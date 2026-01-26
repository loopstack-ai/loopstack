import { Injectable } from '@nestjs/common';
import { BlockConfig, Document, Tool } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { ErrorDocument, MarkdownDocument, MessageDocument, PlainDocument } from '../../documents';
import { CreateDocument } from '../../tools';

@Injectable()
@BlockConfig({
  config: {
    description: 'Test the displaying of core ui documents',
  },
  configFile: __dirname + '/test-ui-documents.workflow.yaml',
})
export class TestUiDocumentsWorkflow extends WorkflowBase {
  @Tool() private createDocument: CreateDocument;
  @Document() private errorDocument: ErrorDocument;
  @Document() private markdownDocument: MarkdownDocument;
  @Document() private messageDocument: MessageDocument;
  @Document() private plainDocument: PlainDocument;
}
