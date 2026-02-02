import type { LucideIcon } from 'lucide-react';
import { File, FileCode, FileJson, FileText } from 'lucide-react';

const EXTENSION_ICONS: Record<string, LucideIcon> = {
  '.ts': FileCode,
  '.tsx': FileCode,
  '.js': FileCode,
  '.jsx': FileCode,
  '.mjs': FileCode,
  '.cjs': FileCode,
  '.json': FileJson,
  '.md': FileText,
  '.mdx': FileText,
  '.css': FileCode,
  '.html': FileCode,
  '.svg': File,
  '.ico': File,
};

export function getFileIcon(name: string): LucideIcon {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  return EXTENSION_ICONS[ext] ?? File;
}
