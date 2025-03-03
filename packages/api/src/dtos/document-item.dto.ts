import { Expose, plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentEntity } from '@loopstack/core';
import { DocumentMetaDto } from './document-meta.dto';

/**
 * Data Transfer Object for Document Item entities
 * Represents a simplified document with essential metadata and workflow information
 */
export class DocumentItemDto {
  /**
   * Unique identifier of the document
   */
  @Expose()
  @ApiProperty({
    description: 'Unique identifier of the document',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  /**
   * Name of the document
   */
  @Expose()
  @ApiProperty({
    description: 'Name of the document',
    example: 'Contract Agreement',
  })
  name: string;

  /**
   * Type of the document
   */
  @Expose()
  @ApiProperty({
    description: 'Type of the document',
    example: 'document',
  })
  type: string;

  /**
   * Document metadata
   */
  @Expose()
  @ApiProperty({
    type: () => DocumentMetaDto,
    description: 'Document metadata',
  })
  meta: DocumentMetaDto | null;

  /**
   * Indicates if the document is invalidated
   */
  @Expose()
  @ApiProperty({
    description: 'Indicates if the document is invalidated',
    example: false,
  })
  isInvalidated: boolean;

  /**
   * Indicates if the document is pending removal
   */
  @Expose()
  @ApiProperty({
    description: 'Indicates if the document is pending removal',
    example: false,
  })
  isPendingRemoval: boolean;

  /**
   * Date when the document was created
   */
  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Date when the document was created',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  /**
   * Date when the document was last updated
   */
  @Expose()
  @ApiProperty({
    type: Date,
    description: 'Date when the document was last updated',
    example: '2023-01-02T00:00:00Z',
  })
  updatedAt: Date;

  /**
   * ID of the workspace the document belongs to
   */
  @Expose()
  @ApiProperty({
    description: 'ID of the workspace the document belongs to',
    example: 'workspace-123',
  })
  workspaceId: string;

  /**
   * ID of the project the document belongs to
   */
  @Expose()
  @ApiProperty({
    description: 'ID of the project the document belongs to',
    example: 'project-456',
  })
  projectId: string;

  /**
   * ID of the workflow the document belongs to
   */
  @Expose()
  @ApiProperty({
    description: 'ID of the workflow the document belongs to',
    example: 'workflow-789',
  })
  workflowId: string;

  /**
   * Creates a DocumentItemDto instance from a DocumentEntity
   * @param document The document entity to convert
   * @returns A new DocumentItemDto instance
   */
  static create<T>(document: DocumentEntity<T>): DocumentItemDto {
    return plainToInstance(DocumentItemDto, document, {
      excludeExtraneousValues: true,
    }) as DocumentItemDto;
  }
}
