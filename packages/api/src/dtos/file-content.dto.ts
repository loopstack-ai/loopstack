import { ApiProperty } from '@nestjs/swagger';

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
}
