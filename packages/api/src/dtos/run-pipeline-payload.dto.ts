import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransitionPayloadInterface } from '@loopstack/shared';

/**
 * DTO for pipeline run payload
 */
export class RunPipelinePayloadDto {
  @IsOptional()
  @ApiPropertyOptional()
  transition?: TransitionPayloadInterface;
}
