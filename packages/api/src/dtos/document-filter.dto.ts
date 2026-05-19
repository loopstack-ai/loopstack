import { IsOptional, IsUUID } from 'class-validator';

export class DocumentFilterDto {
  @IsOptional()
  @IsUUID()
  workflowId?: string;
}
