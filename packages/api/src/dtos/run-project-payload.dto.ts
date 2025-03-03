import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {TransitionPayloadInterface} from "@loopstack/shared";

/**
 * DTO for project run payload
 */
export class RunProjectPayloadDto {
  @IsOptional()
  @ApiPropertyOptional()
  transition?: TransitionPayloadInterface;
}
