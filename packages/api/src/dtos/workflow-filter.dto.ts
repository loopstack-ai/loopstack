import { IsOptional, IsString, IsUUID } from 'class-validator';

export class WorkflowFilterDto {
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  status?: string;
}
