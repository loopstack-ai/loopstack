import type { FileContent, FileExplorerNode } from '../types';

/**
 * Mock file tree data representing a typical project structure
 */
const mockFileTree: FileExplorerNode[] = [
  {
    id: 'src',
    name: 'src',
    path: 'src',
    type: 'folder',
    children: [
      {
        id: 'src/components',
        name: 'components',
        path: 'src/components',
        type: 'folder',
        children: [
          {
            id: 'src/components/Button.tsx',
            name: 'Button.tsx',
            path: 'src/components/Button.tsx',
            type: 'file',
          },
          {
            id: 'src/components/Input.tsx',
            name: 'Input.tsx',
            path: 'src/components/Input.tsx',
            type: 'file',
          },
        ],
      },
      {
        id: 'src/utils',
        name: 'utils',
        path: 'src/utils',
        type: 'folder',
        children: [
          {
            id: 'src/utils/helpers.ts',
            name: 'helpers.ts',
            path: 'src/utils/helpers.ts',
            type: 'file',
          },
        ],
      },
      {
        id: 'src/index.ts',
        name: 'index.ts',
        path: 'src/index.ts',
        type: 'file',
      },
      {
        id: 'src/App.tsx',
        name: 'App.tsx',
        path: 'src/App.tsx',
        type: 'file',
      },
    ],
  },
  {
    id: 'package.json',
    name: 'package.json',
    path: 'package.json',
    type: 'file',
  },
  {
    id: 'tsconfig.json',
    name: 'tsconfig.json',
    path: 'tsconfig.json',
    type: 'file',
  },
  {
    id: 'README.md',
    name: 'README.md',
    path: 'README.md',
    type: 'file',
  },
];

/**
 * Mock file contents
 */
const mockFileContents: Record<string, string> = {
  'src/components/Button.tsx': `import React from 'react';

interface ButtonProps {
  label: string;
  onClick?: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return (
    <button onClick={onClick} className="btn">
      {label}
    </button>
  );
}
`,
  'src/components/Input.tsx': `import React from 'react';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function Input({ value, onChange, placeholder }: InputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
`,
  'src/utils/helpers.ts': `export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
`,
  'src/index.ts': `export * from './App';
export * from './components';
export * from './utils';
`,
  'src/App.tsx': `import React from 'react';
import { Button } from './components/Button';

export function App() {
  return (
    <div>
      <h1>My App</h1>
      <Button label="Click me" />
    </div>
  );
}
`,
  'package.json': `{
  "name": "my-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  }
}
`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react"
  }
}
`,
  'README.md': `# My Project

This is a sample project structure.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`
`,
};

/**
 * Service for fetching file tree and file contents
 * Currently uses mock data, but can be easily extended to fetch from API
 */
export class CodeExplorerService {
  /**
   * Fetch the file tree structure
   * @param pipelineId Optional pipeline ID for future API integration
   */
  async getFileTree(pipelineId?: string): Promise<FileExplorerNode[]> {
    console.log('getFileTree', pipelineId);
    // TODO: Replace with actual API call when backend is ready
    // if (pipelineId) {
    //   const response = await api.get(`/pipelines/${pipelineId}/files`);
    //   return response.data;
    // }
    return Promise.resolve(mockFileTree);
  }

  /**
   * Fetch file content
   * @param filePath Path to the file
   * @param pipelineId Optional pipeline ID for future API integration
   */
  async getFileContent(filePath: string, pipelineId?: string): Promise<FileContent | null> {
    // TODO: Replace with actual API call when backend is ready
    console.log('getFileContent', filePath, pipelineId);
    // if (pipelineId) {
    //   const response = await api.get(`/pipelines/${pipelineId}/files/${encodeURIComponent(filePath)}`);
    //   return { path: filePath, content: response.data.content };
    // }
    const content = mockFileContents[filePath];
    return content ? Promise.resolve({ path: filePath, content }) : Promise.resolve(null);
  }

  /**
   * Fetch multiple file contents at once
   * @param filePaths Array of file paths
   * @param pipelineId Optional pipeline ID for future API integration
   */
  async getFileContents(filePaths: string[], pipelineId?: string): Promise<Record<string, string>> {
    const contents: Record<string, string> = {};
    await Promise.all(
      filePaths.map(async (path) => {
        const content = await this.getFileContent(path, pipelineId);
        if (content) {
          contents[path] = content.content;
        }
      }),
    );
    return contents;
  }
}

export const codeExplorerService = new CodeExplorerService();
