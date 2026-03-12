import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { PipelineSourceInterface } from '@loopstack/contracts/api';

export class PipelineSourceDto implements PipelineSourceInterface {
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
