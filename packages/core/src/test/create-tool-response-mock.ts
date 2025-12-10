import { DocumentEntity, ToolResult } from '@loopstack/common';
import { createDocumentMock } from './create-document-mock';
import { MessageDocument } from '../features/core-document';

export function createDocumentResultMock<T>(
  source: new (...args: any[]) => any,
  content: T,
  documentProps: Partial<DocumentEntity> = {},
): ToolResult {
  const document = createDocumentMock(source, content, documentProps);
  return {
    data: document,
    effects: {
      addWorkflowDocuments: [document],
    },
  };
}

export function createAnyChatMessage() {
  return createDocumentResultMock(MessageDocument, {
    role: 'assistant',
    content: crypto.randomUUID(),
  });
}
