import { Check, Code2, Copy, FileText, FolderOpen, PanelRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DocumentRendererProps } from '@/features/documents/DocumentRenderer';
import { useOptionalWorkbenchLayout } from '@/features/workbench';

interface ChangedFilesContent {
  hostRoot: string;
  paths: string[];
}

interface TreeNode {
  name: string;
  path: string; // repo-relative path of this node
  type: 'file' | 'folder';
  children: TreeNode[];
}

/** Build a nested tree from repo-relative file paths (e.g. `src/auth/login.ts`). */
function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const p of paths) {
    const segments = p.split('/').filter(Boolean);
    let level = root;
    let prefix = '';
    segments.forEach((segment, i) => {
      prefix = prefix ? `${prefix}/${segment}` : segment;
      const isFile = i === segments.length - 1;
      const type = isFile ? 'file' : 'folder';
      let node = level.find((n) => n.name === segment && n.type === type);
      if (!node) {
        node = { name: segment, path: prefix, type, children: [] };
        level.push(node);
      }
      level = node.children;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));
    nodes.forEach((n) => sort(n.children));
  };
  sort(root);
  return root;
}

/**
 * Renderer for the `changed-files` document: the run's edited files as a tree, each node openable in Zed
 * (copy `zed "<hostRoot>/<path>"`) and — for files — in the in-Studio file explorer. Used in the Handoff
 * panel and inline in the run timeline.
 */
export function ChangedFilesCard({ document }: DocumentRendererProps) {
  const content = (document.content ?? {}) as ChangedFilesContent;
  const layout = useOptionalWorkbenchLayout();
  const tree = useMemo(() => buildTree(content.paths ?? []), [content.paths]);
  const [copied, setCopied] = useState<string | null>(null);

  if (!content.paths?.length) return null;

  const copyZed = async (nodePath: string) => {
    await navigator.clipboard.writeText(`zed "${content.hostRoot}/${nodePath}"`);
    setCopied(nodePath);
    setTimeout(() => setCopied((c) => (c === nodePath ? null : c)), 1500);
  };

  const renderNodes = (nodes: TreeNode[], depth: number): React.ReactNode =>
    nodes.map((node) => (
      <div key={node.path}>
        <div
          className="group hover:bg-muted/50 flex items-center gap-1 rounded px-1 py-0.5"
          style={{ paddingLeft: depth * 12 + 4 }}
        >
          {node.type === 'folder' ? (
            <FolderOpen className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          ) : (
            <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate font-mono text-xs">{node.name}</span>
          <span className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
            {node.type === 'file' && layout && (
              <button
                type="button"
                title="Open in file explorer"
                onClick={() => layout.openFileInExplorer(node.path)}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <PanelRight className="h-3.5 w-3.5" />
              </button>
            )}
            {node.type === 'file' && (
              <a
                href={encodeURI(`vscode://file${content.hostRoot}/${node.path}`)}
                title="Open in VS Code"
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <Code2 className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              title="Copy 'zed' command"
              onClick={() => void copyZed(node.path)}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              {copied === node.path ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </span>
        </div>
        {node.children.length > 0 && renderNodes(node.children, depth + 1)}
      </div>
    ));

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">Changed files</div>
      <div className="rounded-md border p-1">{renderNodes(tree, 0)}</div>
    </div>
  );
}
