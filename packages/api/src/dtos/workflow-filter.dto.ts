import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class WorkflowFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  namespaceId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  pipelineId?: string;
}
