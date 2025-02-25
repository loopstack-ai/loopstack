import {
  IsString,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class ProjectCreateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;
}
