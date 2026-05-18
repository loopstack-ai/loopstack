import { IsOptional, IsString } from 'class-validator';
import type { WorkflowSourceInterface } from '@loopstack/contracts/api';

export class WorkflowSourceDto implements WorkflowSourceInterface {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  filePath: string | null;

  @IsString()
  @IsOptional()
  raw: string | null;
}
