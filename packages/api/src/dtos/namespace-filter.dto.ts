import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NamespaceFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  projectId?: string;
}
