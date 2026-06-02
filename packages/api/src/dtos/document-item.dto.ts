import { Expose, plainToInstance } from 'class-transformer';
import { DocumentEntity } from '@loopstack/common';
import type { DocumentItemInterface, DynamicDocumentMeta } from '@loopstack/contracts/types';
import { DocumentContentDto } from './document-content.dto.js';

/**
 * Data Transfer Object for Document Item entities
 * Represents a simplified document with essential metadata and workflow information
 */
export class DocumentItemDto implements DocumentItemInterface {
  /**
   * Unique identifier of the document
   */
  @Expose()
  id: string;

  /**
   * Name of the document
   */
  @Expose()
  name: string;

  /**
   * Config Key of the document
   */
  @Expose()
  alias: string;

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
   * Indicates if the document is pending removal
   */
  @Expose()
  isPendingRemoval: boolean;

  /**
   * Version of the document
   */
  @Expose()
  version: number;

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
  place: string;

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
   * Creates a DocumentItemDto instance from a DocumentEntity
   * @param document The document entity to convert
   * @returns A new DocumentItemDto instance
   */
  static create<T>(document: DocumentEntity<T>): DocumentItemDto {
    return plainToInstance(DocumentItemDto, document, {
      excludeExtraneousValues: true,
    });
  }
}
