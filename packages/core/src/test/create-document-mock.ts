import { DocumentEntity } from '@loopstack/common';

export function createDocumentMock<T>(source: new (...args: any[]) => any, content: T, documentProps: Partial<DocumentEntity> = {}): DocumentEntity {
  return {
    ...documentProps,
    configKey: source.name,
    content: content,
  } as DocumentEntity<T>;
}