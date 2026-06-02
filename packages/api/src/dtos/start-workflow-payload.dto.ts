import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class StartWorkflowPayloadDto {
  @IsString()
  @IsNotEmpty()
  workflowName: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsObject()
  @IsOptional()
  args?: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];
}
