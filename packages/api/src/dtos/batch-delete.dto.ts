import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class BatchDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  @ApiProperty({
    description: 'Array of UUIDs to delete',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  ids: string[];
}
