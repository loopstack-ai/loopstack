import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { TransitionPayloadInterface } from '@loopstack/contracts/types';

/**
 * DTO for pipeline run payload
 */
export class RunPipelinePayloadDto {
  @IsOptional()
  @ApiPropertyOptional()
  transition?: TransitionPayloadInterface;
}
