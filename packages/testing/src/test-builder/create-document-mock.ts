import { DocumentEntity, deriveDocumentIdentifier } from '@loopstack/common';

export function createDocumentMock<T>(
  source: new (...args: any[]) => any,
  content: T,
  documentProps: Partial<DocumentEntity> = {},
): DocumentEntity {
  return {
    documentName: deriveDocumentIdentifier(source.name),
    ...documentProps,
    content: content,
  } as DocumentEntity<T>;
}
