import { IsString, IsArray, ArrayNotEmpty, IsOptional } from 'class-validator';
import {ApiPropertyOptional} from "@nestjs/swagger";

export class ProjectUpdateDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  title?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: 'array', items: { type: 'string' }})
  labels?: string[];
}
