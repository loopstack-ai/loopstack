import { Expose, plainToInstance } from 'class-transformer';
import { DocumentEntity } from '@loopstack/common';
import type { DynamicDocumentMeta } from '@loopstack/contracts/types';
import { DocumentContentDto } from './document-content.dto.js';

/**
 * Data Transfer Object for Document entities
 */
export class DocumentDto {
  /**
   * Unique identifier of the document
   */
  @Expose()
  id: string;

  /**
   * Snake_case identifier of the document type
   */
  @Expose()
  documentName: string;

  /**
   * Contents of the document.
   */
  @Expose()
  content: DocumentContentDto | null;

  @Expose()
  validationError: any;

  @Expose()
  meta: DynamicDocumentMeta | null;

  /**
   * Indicates if the document is invalidated
   */
  @Expose()
  isInvalidated: boolean;

  /**
   * Index of the document
   */
  @Expose()
  index: number;

  /**
   * Transition when this document was created
   */
  @Expose()
  transition: string | null;

  /**
   * Place when this document was created
   */
  @Expose()
  place: string | null;

  @Expose()
  labels: string[];

  @Expose()
  tags: string[];

  /**
   * Date when the document was created
   */
  @Expose()
  createdAt: Date;

  /**
   * Date when the document was last updated
   */
  @Expose()
  updatedAt: Date;

  /**
   * ID of the workspace the document belongs to
   */
  @Expose()
  workspaceId: string;

  /**
   * ID of the workflow the document belongs to
   */
  @Expose()
  workflowId: string;

  /**
   * Creates a DocumentDto instance from a DocumentEntity
   * @param document The document entity to convert
   * @returns A new DocumentDto instance
   */
  static create(document: DocumentEntity): DocumentDto {
    return plainToInstance(DocumentDto, document, {
      excludeExtraneousValues: true,
    });
  }
}
