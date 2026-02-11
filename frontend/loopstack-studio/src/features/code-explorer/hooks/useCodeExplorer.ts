import { useCallback, useEffect, useState } from 'react';
import { codeExplorerService } from '../services/codeExplorerService';
import type { FileExplorerNode } from '../types';

interface UseCodeExplorerOptions {
  pipelineId?: string;
  initialSelectedPath?: string;
}

interface UseCodeExplorerReturn {
  fileTree: FileExplorerNode[];
  selectedFile: FileExplorerNode | null;
  fileContent: string | null;
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectFile: (node: FileExplorerNode) => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
}

export function useCodeExplorer({
  pipelineId,
  initialSelectedPath,
}: UseCodeExplorerOptions = {}): UseCodeExplorerReturn {
  const [fileTree, setFileTree] = useState<FileExplorerNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileExplorerNode | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadFileTree = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tree = await codeExplorerService.getFileTree(pipelineId);
      setFileTree(tree);

      if (initialSelectedPath && tree.length > 0) {
        const findNodeByPath = (nodes: FileExplorerNode[], path: string): FileExplorerNode | null => {
          for (const node of nodes) {
            if (node.path === path) {
              return node;
            }
            if (node.children) {
              const found = findNodeByPath(node.children, path);
              if (found) return found;
            }
          }
          return null;
        };

        const node = findNodeByPath(tree, initialSelectedPath);
        if (node && node.type === 'file') {
          setSelectedFile(node);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load file tree'));
    } finally {
      setIsLoading(false);
    }
  }, [pipelineId, initialSelectedPath]);

  const loadFileContent = useCallback(
    async (node: FileExplorerNode) => {
      if (node.type !== 'file') {
        setFileContent(null);
        return;
      }

      try {
        setError(null);
        const content = await codeExplorerService.getFileContent(node.path, pipelineId);
        setFileContent(content?.content ?? null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(`Failed to load file: ${node.path}`));
        setFileContent(null);
      }
    },
    [pipelineId],
  );

  const selectFile = useCallback(
    (node: FileExplorerNode) => {
      if (node.type === 'file') {
        setSelectedFile(node);
        void loadFileContent(node);
      }
    },
    [loadFileContent],
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setFileContent(null);
  }, []);

  const refresh = useCallback(async () => {
    await loadFileTree();
    if (selectedFile) {
      await loadFileContent(selectedFile);
    }
  }, [loadFileTree, loadFileContent, selectedFile]);

  useEffect(() => {
    void loadFileTree();
  }, [loadFileTree]);

  // Load content when selected file changes
  useEffect(() => {
    if (selectedFile && selectedFile.type === 'file') {
      void loadFileContent(selectedFile);
    }
  }, [selectedFile, loadFileContent]);

  return {
    fileTree,
    selectedFile,
    fileContent,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectFile,
    clearSelection,
    refresh,
  };
}
