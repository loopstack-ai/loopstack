import {
  IsString,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  IsUUID,
  IsOptional,
} from 'class-validator';
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";

export class ProjectCreateDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name: string;

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

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty()
  workspaceId: string;
}
