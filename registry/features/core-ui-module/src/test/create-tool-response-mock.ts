import { DocumentEntity, ToolResult } from '@loopstack/common';
import { createDocumentMock } from '@loopstack/core';
import { MessageDocument } from '../documents';

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
