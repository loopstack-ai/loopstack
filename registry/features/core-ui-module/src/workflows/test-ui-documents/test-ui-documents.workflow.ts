import { BlockConfig, Tool, Document } from '@loopstack/common';
import { Injectable } from '@nestjs/common';
import { CreateDocument } from '../../tools';
import { ErrorDocument, MarkdownDocument, MessageDocument, PlainDocument } from '../../documents';
import { WorkflowBase } from '@loopstack/core';

@Injectable()
@BlockConfig({
  config:{
    description: 'Test the displaying of core ui documents'
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
