import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  projectId?: string;
}
