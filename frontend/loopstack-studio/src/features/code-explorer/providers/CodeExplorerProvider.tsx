import type { AxiosError } from 'axios';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FileExplorerNodeDto, PipelineConfigDto } from '@loopstack/api-client';
import { useFileContent, useFileTree } from '@/hooks/useFiles';
import type { FileExplorerNode } from '../types';

function extractErrorMessage(error: Error | null): Error | null {
  if (!error) return null;

  if ('isAxiosError' in error && error.isAxiosError) {
    const axiosError = error as AxiosError<{ message?: string } | string>;
    const responseData = axiosError.response?.data;

    if (typeof responseData === 'object' && responseData !== null && 'message' in responseData) {
      return new Error(String(responseData.message));
    }
    if (typeof responseData === 'string') {
      return new Error(responseData);
    }
  }

  return error;
}

interface CodeExplorerContextValue {
  fileTree: FileExplorerNode[];
  openFiles: FileExplorerNode[];
  selectedFile: FileExplorerNode | null;
  fileContent: string | null;
  workflowConfig: PipelineConfigDto | null;
  isTreeLoading: boolean;
  isContentLoading: boolean;
  error: Error | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectFile: (node: FileExplorerNode) => void;
  clearSelection: () => void;
  closeFile: (node: FileExplorerNode) => void;
  closeAll: () => void;
  closeOthers: (node: FileExplorerNode) => void;
  closeToLeft: (node: FileExplorerNode) => void;
  closeToRight: (node: FileExplorerNode) => void;
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
  const [openFiles, setOpenFiles] = useState<FileExplorerNode[]>([]);
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

  const workflowConfig = useMemo(() => {
    return fileContentQuery.data?.workflowConfig ?? null;
  }, [fileContentQuery.data]);

  const isTreeLoading = fileTreeQuery.isLoading && !fileTreeQuery.data;
  const isContentLoading = fileContentQuery.isLoading && selectedFile !== null && !fileContentQuery.data;

  const error = extractErrorMessage(fileTreeQuery.error) || extractErrorMessage(fileContentQuery.error) || null;

  useEffect(() => {
    if (initialSelectedPath && fileTree.length > 0 && !selectedFile && openFiles.length === 0) {
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
        setOpenFiles([node]);
        setSelectedFile(node);
      }
    }
  }, [initialSelectedPath, fileTree, selectedFile, openFiles.length]);

  const selectFile = useCallback((node: FileExplorerNode) => {
    if (node.type === 'file') {
      setOpenFiles((prev) => {
        const existingIndex = prev.findIndex((f) => f.path === node.path);
        if (existingIndex >= 0) {
          setSelectedFile(node);
          return prev;
        } else {
          const updated = [...prev, node];
          setSelectedFile(node);
          return updated;
        }
      });
    }
  }, []);

  const clearSelection = useCallback(() => {
    if (selectedFile) {
      setOpenFiles((prev) => {
        const updated = prev.filter((f) => f.path !== selectedFile.path);
        if (updated.length > 0) {
          const currentIndex = prev.findIndex((f) => f.path === selectedFile.path);
          const newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
          setSelectedFile(updated[newIndex]);
        } else {
          setSelectedFile(null);
        }
        return updated;
      });
    }
  }, [selectedFile]);

  const closeFile = useCallback(
    (node: FileExplorerNode) => {
      setOpenFiles((prev) => {
        const updated = prev.filter((f) => f.path !== node.path);
        if (selectedFile?.path === node.path) {
          if (updated.length > 0) {
            const currentIndex = prev.findIndex((f) => f.path === node.path);
            const newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
            setSelectedFile(updated[newIndex]);
          } else {
            setSelectedFile(null);
          }
        }
        return updated;
      });
    },
    [selectedFile],
  );

  const closeAll = useCallback(() => {
    setOpenFiles([]);
    setSelectedFile(null);
  }, []);

  const closeOthers = useCallback((node: FileExplorerNode) => {
    setOpenFiles([node]);
    setSelectedFile(node);
  }, []);

  const closeToLeft = useCallback(
    (node: FileExplorerNode) => {
      setOpenFiles((prev) => {
        const nodeIndex = prev.findIndex((f) => f.path === node.path);
        if (nodeIndex <= 0) return prev;

        const updated = prev.slice(nodeIndex);
        if (selectedFile && prev.findIndex((f) => f.path === selectedFile.path) < nodeIndex) {
          setSelectedFile(node);
        }
        return updated;
      });
    },
    [selectedFile],
  );

  const closeToRight = useCallback(
    (node: FileExplorerNode) => {
      setOpenFiles((prev) => {
        const nodeIndex = prev.findIndex((f) => f.path === node.path);
        if (nodeIndex < 0 || nodeIndex >= prev.length - 1) return prev;

        const updated = prev.slice(0, nodeIndex + 1);

        if (selectedFile && prev.findIndex((f) => f.path === selectedFile.path) > nodeIndex) {
          setSelectedFile(node);
        }
        return updated;
      });
    },
    [selectedFile],
  );

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
    openFiles,
    selectedFile,
    fileContent,
    workflowConfig,
    isTreeLoading,
    isContentLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectFile,
    clearSelection,
    closeFile,
    closeAll,
    closeOthers,
    closeToLeft,
    closeToRight,
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
