import { ApiProperty } from '@nestjs/swagger';

export class FileExplorerNodeDto {
  @ApiProperty({
    description: 'Unique identifier for the file/folder node',
    example: 'src/components/Button.tsx',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the file or folder',
    example: 'Button.tsx',
  })
  name!: string;

  @ApiProperty({
    description: 'Full path of the file or folder relative to workspace root',
    example: 'src/components/Button.tsx',
  })
  path!: string;

  @ApiProperty({
    description: 'Type of the node',
    enum: ['file', 'folder'],
    example: 'file',
  })
  type!: 'file' | 'folder';

  @ApiProperty({
    description: 'Child nodes (only present for folders)',
    type: [FileExplorerNodeDto],
    required: false,
  })
  children?: FileExplorerNodeDto[];
}
