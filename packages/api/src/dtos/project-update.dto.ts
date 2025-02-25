import { IsString, IsArray, ArrayNotEmpty, IsOptional } from 'class-validator';

export class ProjectUpdateDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];
}
