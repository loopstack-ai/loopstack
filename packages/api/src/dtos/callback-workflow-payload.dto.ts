import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * DTO for workflow callback payload
 */
export class CallbackWorkflowPayloadDto {
  @IsString()
  @ApiProperty({ description: 'The transition method to trigger on the workflow' })
  transition: string;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    description: 'Payload data to pass to the transition',
    type: 'object',
    additionalProperties: true,
  })
  payload?: Record<string, unknown>;
}
