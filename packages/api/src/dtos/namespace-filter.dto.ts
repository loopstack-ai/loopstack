import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class NamespaceFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  pipelineId?: string;
}
