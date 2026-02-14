import { File, FileCode, FileJson, FileText, Folder, FolderOpen, type LucideIcon } from 'lucide-react';

const EXTENSION_ICON_MAP: Record<string, LucideIcon> = {
  // TypeScript
  '.ts': FileCode,
  '.tsx': FileCode,
  '.mts': FileCode,
  '.cts': FileCode,
  // JavaScript
  '.js': FileCode,
  '.jsx': FileCode,
  '.mjs': FileCode,
  '.cjs': FileCode,
  // JSON
  '.json': FileJson,
  '.jsonc': FileJson,
  // Markdown
  '.md': FileText,
  '.mdx': FileText,
  '.markdown': FileText,
  // Config files
  '.yaml': FileCode,
  '.yml': FileCode,
  '.toml': FileCode,
  '.ini': FileCode,
  '.conf': FileCode,
  '.config': FileCode,
  // Styles
  '.css': FileCode,
  '.scss': FileCode,
  '.sass': FileCode,
  '.less': FileCode,
  // HTML
  '.html': FileCode,
  '.htm': FileCode,
  // Shell
  '.sh': FileCode,
  '.bash': FileCode,
  '.zsh': FileCode,
  '.fish': FileCode,
  // Other
  '.txt': FileText,
  '.log': FileText,
  '.env': FileText,
};

export function getFileIcon(fileName: string): LucideIcon {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
  return EXTENSION_ICON_MAP[ext] ?? File;
}

export function getFolderIcon(isOpen: boolean): LucideIcon {
  return isOpen ? FolderOpen : Folder;
}
