import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineConfigDto } from './pipeline-config.dto';

export class FileContentDto {
  @ApiProperty({
    description: 'Path of the file relative to workspace root',
    example: 'src/components/Button.tsx',
  })
  path!: string;

  @ApiProperty({
    description: 'Content of the file',
    example: "import React from 'react';\n\nexport function Button() { ... }",
  })
  content!: string;

  @ApiPropertyOptional({
    description: 'Parsed workflow configuration if the file is a YAML workflow file',
    type: PipelineConfigDto,
  })
  workflowConfig?: PipelineConfigDto;
}
