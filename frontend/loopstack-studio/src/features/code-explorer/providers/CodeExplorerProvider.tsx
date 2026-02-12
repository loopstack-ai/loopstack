import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { codeExplorerService } from '../services/codeExplorerService';
import type { FileExplorerNode } from '../types';

interface CodeExplorerContextValue {
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

const CodeExplorerContext = createContext<CodeExplorerContextValue | null>(null);

interface CodeExplorerProviderProps {
  children: React.ReactNode;
  pipelineId?: string;
  initialSelectedPath?: string;
}

export function CodeExplorerProvider({ children, pipelineId, initialSelectedPath }: CodeExplorerProviderProps) {
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
        if (selectedFile?.id === node.id) {
          setSelectedFile(null);
          setFileContent(null);
        } else {
          setSelectedFile(node);
          void loadFileContent(node);
        }
      }
    },
    [loadFileContent, selectedFile],
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

  useEffect(() => {
    if (selectedFile && selectedFile.type === 'file') {
      void loadFileContent(selectedFile);
    }
  }, [selectedFile, loadFileContent]);

  const value: CodeExplorerContextValue = {
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

  return <CodeExplorerContext.Provider value={value}>{children}</CodeExplorerContext.Provider>;
}

export function useCodeExplorerContext(): CodeExplorerContextValue {
  const context = useContext(CodeExplorerContext);
  if (!context) {
    throw new Error('useCodeExplorerContext must be used within CodeExplorerProvider');
  }
  return context;
}
