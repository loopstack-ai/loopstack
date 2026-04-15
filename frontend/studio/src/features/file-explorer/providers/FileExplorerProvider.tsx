import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useFileContent, useFileTree } from '../hooks/useFileExplorer';
import type { FileExplorerNode } from '../types';

export interface FileExplorerContextValue {
  nodes: FileExplorerNode[];
  isTreeLoading: boolean;
  treeError: Error | null;
  isFetchingTree: boolean;
  openFiles: FileExplorerNode[];
  selectedFile: FileExplorerNode | null;
  fileContent: string | null;
  isContentLoading: boolean;
  expandedFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
  selectFile: (node: FileExplorerNode) => void;
  closeFile: (node: FileExplorerNode) => void;
  closeAll: () => void;
  closeOthers: (node: FileExplorerNode) => void;
  closeToLeft: (node: FileExplorerNode) => void;
  closeToRight: (node: FileExplorerNode) => void;
  clearSelection: () => void;
  refreshTree: () => void;
}

const FileExplorerContext = createContext<FileExplorerContextValue | null>(null);

interface FileExplorerProviderProps {
  workspaceId?: string;
  enabled?: boolean;
  children: ReactNode;
}

export function FileExplorerProvider({ workspaceId, enabled = true, children }: FileExplorerProviderProps) {
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [openFiles, setOpenFiles] = useState<FileExplorerNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileExplorerNode | null>(null);

  const treeQuery = useFileTree(workspaceId, enabled);
  const contentQuery = useFileContent(
    workspaceId,
    selectedFile?.type === 'file' ? selectedFile.path : undefined,
    enabled,
  );

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

  const selectFile = useCallback((node: FileExplorerNode) => {
    if (node.type !== 'file') return;
    setSelectedFile(node);
    setOpenFiles((prev) => {
      if (prev.some((f) => f.path === node.path)) return prev;
      return [...prev, node];
    });
  }, []);

  const closeFile = useCallback(
    (node: FileExplorerNode) => {
      setOpenFiles((prev) => {
        const updated = prev.filter((f) => f.path !== node.path);
        if (selectedFile?.path === node.path) {
          if (updated.length > 0) {
            const idx = prev.findIndex((f) => f.path === node.path);
            setSelectedFile(updated[Math.max(0, idx - 1)]);
          } else {
            setSelectedFile(null);
          }
        }
        return updated;
      });
    },
    [selectedFile],
  );

  const clearSelection = useCallback(() => {
    if (!selectedFile) return;
    setOpenFiles((prev) => {
      const updated = prev.filter((f) => f.path !== selectedFile.path);
      if (updated.length > 0) {
        const idx = prev.findIndex((f) => f.path === selectedFile.path);
        setSelectedFile(updated[Math.max(0, idx - 1)]);
      } else {
        setSelectedFile(null);
      }
      return updated;
    });
  }, [selectedFile]);

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

  const refreshTree = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['file-explorer-tree'] });
  }, [queryClient]);

  const value = useMemo<FileExplorerContextValue>(
    () => ({
      nodes: treeQuery.data ?? [],
      isTreeLoading: treeQuery.isLoading && !treeQuery.data,
      treeError: treeQuery.error,
      isFetchingTree: treeQuery.isFetching,
      openFiles,
      selectedFile,
      fileContent: contentQuery.data?.content ?? null,
      isContentLoading: contentQuery.isLoading && !!selectedFile,
      expandedFolders,
      toggleFolder,
      selectFile,
      closeFile,
      closeAll,
      closeOthers,
      closeToLeft,
      closeToRight,
      clearSelection,
      refreshTree,
    }),
    [
      treeQuery.data,
      treeQuery.isLoading,
      treeQuery.error,
      treeQuery.isFetching,
      openFiles,
      selectedFile,
      contentQuery.data,
      contentQuery.isLoading,
      expandedFolders,
      toggleFolder,
      selectFile,
      closeFile,
      closeAll,
      closeOthers,
      closeToLeft,
      closeToRight,
      clearSelection,
      refreshTree,
    ],
  );

  return <FileExplorerContext.Provider value={value}>{children}</FileExplorerContext.Provider>;
}

export function useFileExplorer(): FileExplorerContextValue {
  const ctx = useContext(FileExplorerContext);
  if (!ctx) {
    throw new Error('useFileExplorer must be used within FileExplorerProvider');
  }
  return ctx;
}

export function useOptionalFileExplorer(): FileExplorerContextValue | null {
  return useContext(FileExplorerContext);
}
