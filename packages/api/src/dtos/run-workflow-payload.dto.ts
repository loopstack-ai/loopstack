import { IsOptional } from 'class-validator';
import type { RunWorkflowPayloadInterface } from '@loopstack/contracts/api';
import { TransitionPayloadInterface } from '@loopstack/contracts/types';

/**
 * DTO for workflow run payload
 */
export class RunWorkflowPayloadDto implements RunWorkflowPayloadInterface {
  @IsOptional()
  transition?: TransitionPayloadInterface;
}
