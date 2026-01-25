import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class PipelineFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  workspaceId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  parentId?: string | null;
}
