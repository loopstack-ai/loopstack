import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PipelineFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  workspaceId?: string;

  @IsOptional()
  @ApiPropertyOptional()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  status?: string;
}
