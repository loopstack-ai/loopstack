import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import type { RunPipelinePayloadInterface } from '@loopstack/contracts/api';
import { TransitionPayloadInterface } from '@loopstack/contracts/types';

/**
 * DTO for pipeline run payload
 */
export class RunPipelinePayloadDto implements RunPipelinePayloadInterface {
  @IsOptional()
  @ApiPropertyOptional()
  transition?: TransitionPayloadInterface;
}
