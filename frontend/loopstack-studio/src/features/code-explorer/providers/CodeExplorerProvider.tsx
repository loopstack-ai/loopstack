import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FileExplorerNodeDto } from '@loopstack/api-client';
import { useFileContent, useFileTree } from '@/hooks/useFiles';
import type { FileExplorerNode } from '../types';

interface CodeExplorerContextValue {
  fileTree: FileExplorerNode[];
  selectedFile: FileExplorerNode | null;
  fileContent: string | null;
  isTreeLoading: boolean;
  isContentLoading: boolean;
  error: Error | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectFile: (node: FileExplorerNode) => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
  expandedFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
}

const CodeExplorerContext = createContext<CodeExplorerContextValue | null>(null);

interface CodeExplorerProviderProps {
  children: React.ReactNode;
  pipelineId?: string;
  initialSelectedPath?: string;
}

function mapDtoToNode(dto: FileExplorerNodeDto): FileExplorerNode {
  return {
    id: dto.id,
    name: dto.name,
    path: dto.path,
    type: dto.type as 'file' | 'folder',
    children: dto.children?.map(mapDtoToNode),
  };
}

export function CodeExplorerProvider({ children, pipelineId, initialSelectedPath }: CodeExplorerProviderProps) {
  const [selectedFile, setSelectedFile] = useState<FileExplorerNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const fileTreeQuery = useFileTree(pipelineId);
  const fileContentQuery = useFileContent(pipelineId, selectedFile?.path);

  const fileTree = useMemo(() => {
    if (!fileTreeQuery.data) return [];
    return fileTreeQuery.data.map(mapDtoToNode);
  }, [fileTreeQuery.data]);

  const fileContent = useMemo(() => {
    return fileContentQuery.data?.content ?? null;
  }, [fileContentQuery.data]);

  const isTreeLoading = fileTreeQuery.isLoading && !fileTreeQuery.data;
  const isContentLoading = fileContentQuery.isLoading && selectedFile !== null && !fileContentQuery.data;
  const error = fileTreeQuery.error || fileContentQuery.error || null;

  useEffect(() => {
    if (initialSelectedPath && fileTree.length > 0 && !selectedFile) {
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

      const node = findNodeByPath(fileTree, initialSelectedPath);
      if (node && node.type === 'file') {
        setSelectedFile(node);
      }
    }
  }, [initialSelectedPath, fileTree, selectedFile]);

  const selectFile = useCallback(
    (node: FileExplorerNode) => {
      if (node.type === 'file') {
        if (selectedFile?.id === node.id) {
          setSelectedFile(null);
        } else {
          setSelectedFile(node);
        }
      }
    },
    [selectedFile],
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const refresh = useCallback(async () => {
    await fileTreeQuery.refetch();
    if (selectedFile) {
      await fileContentQuery.refetch();
    }
  }, [fileTreeQuery, fileContentQuery, selectedFile]);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const value: CodeExplorerContextValue = {
    fileTree,
    selectedFile,
    fileContent,
    isTreeLoading,
    isContentLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectFile,
    clearSelection,
    refresh,
    expandedFolders,
    toggleFolder,
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
