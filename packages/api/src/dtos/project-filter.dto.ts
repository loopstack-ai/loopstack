import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  workspaceId?: string;
}
