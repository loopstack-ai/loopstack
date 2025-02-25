import { IsOptional, IsUUID } from 'class-validator';

export class ProjectFilterDto {
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
