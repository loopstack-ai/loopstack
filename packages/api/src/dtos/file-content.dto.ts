import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FileContentInterface } from '@loopstack/contracts/api';
import { WorkflowConfigDto } from './workflow-config.dto';

export class FileContentDto implements FileContentInterface {
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
    type: WorkflowConfigDto,
  })
  workflowConfig?: WorkflowConfigDto;
}
