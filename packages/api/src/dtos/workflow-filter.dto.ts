import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class WorkflowFilterDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ nullable: true })
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  status?: string;
}
