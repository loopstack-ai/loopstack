import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PipelineSourceDto {
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
