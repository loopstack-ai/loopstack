import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
