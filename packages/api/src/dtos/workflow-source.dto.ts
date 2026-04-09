import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { WorkflowSourceInterface } from '@loopstack/contracts/api';

export class WorkflowSourceDto implements WorkflowSourceInterface {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ nullable: true, type: 'string' })
  @IsString()
  @IsOptional()
  filePath: string | null;

  @ApiProperty({ nullable: true, type: 'string' })
  @IsString()
  @IsOptional()
  raw: string | null;
}
