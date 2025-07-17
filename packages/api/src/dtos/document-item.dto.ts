import { Expose, plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentMetaDto } from './document-meta.dto';
import { DocumentContentDto } from './document-content.dto';
import { DocumentEntity, JSONSchemaConfigType } from '@loopstack/shared';
import { UISchemaType } from '@loopstack/shared/dist/schemas/ui.schema';

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
   * Contents of the document
   */
  @Expose()
  @ApiProperty({
    type: () => DocumentContentDto,
    description: 'Contents of the document',
  })
  content: DocumentContentDto | null;

  @Expose()
  @ApiProperty({
    description: 'The json schema for document validation',
  })
  schema: JSONSchemaConfigType;

  @Expose()
  @ApiProperty({
    description: 'The ui config for interface rendering',
  })
  ui: UISchemaType;

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
   * Version of the document
   */
  @Expose()
  @ApiProperty({
    description: 'Version of the document',
    example: 1,
  })
  version: number;

  /**
   * Index of the document
   */
  @Expose()
  @ApiProperty({
    description: 'Index of the document',
    example: 0,
  })
  index: number;

  /**
   * Transition when this document was created
   */
  @Expose()
  @ApiProperty({
    description: 'Transition when this document was created',
    example: 'review',
  })
  transition: string | null;

  /**
   * Place when this document was created
   */
  @Expose()
  @ApiProperty({
    description: 'Place when this document was created',
    example: 'pending',
    type: 'string',
    nullable: true,
  })
  place: string;

  @Expose()
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    description: "Labels associated with the document's namespace",
    example: ['frontend', 'featureXY'],
  })
  labels: string[];

  @Expose()
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    description:
      'Tags associated with the document for categorization and filtering',
    example: ['tag1', 'tag2'],
  })
  tags: string[];

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
   * ID of the pipeline the document belongs to
   */
  @Expose()
  @ApiProperty({
    description: 'ID of the pipeline the document belongs to',
    example: 'pipeline-456',
  })
  pipelineId: string;

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
