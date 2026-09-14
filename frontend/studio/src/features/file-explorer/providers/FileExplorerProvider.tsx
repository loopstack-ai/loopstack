import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLoopstackClient } from '@loopstack/react';
import { type FileExplorerVariant, fileTreeKey, useFileContent, useFileTree } from '../hooks/useFileExplorer';
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
  variant: FileExplorerVariant;
  workspaceId?: string;
  slotId?: string;
  enabled?: boolean;
  /** A path another panel asked to open; resolved against the tree and selected once it loads, then cleared. */
  requestedFilePath?: string | null;
  onRequestConsumed?: () => void;
  children: ReactNode;
}

export function FileExplorerProvider({
  variant,
  workspaceId,
  slotId,
  enabled = true,
  requestedFilePath,
  onRequestConsumed,
  children,
}: FileExplorerProviderProps) {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [openFiles, setOpenFiles] = useState<FileExplorerNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileExplorerNode | null>(null);

  const treeQuery = useFileTree(variant, workspaceId, slotId, enabled);
  const contentQuery = useFileContent(
    variant,
    workspaceId,
    selectedFile?.type === 'file' ? selectedFile.path : undefined,
    slotId,
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

  // Deep-open: when another panel requested a path, resolve it against the loaded tree (matching on the
  // repo-relative tail, so a container-absolute `/workspace/...` tree path still matches), expand its
  // folders, select it, then clear the request. Cleared even when not found so it doesn't retry forever.
  useEffect(() => {
    if (!requestedFilePath || !treeQuery.data) return;
    const norm = (p: string) => p.replace(/^\/?workspace\//, '').replace(/^\/+/, '');
    const target = norm(requestedFilePath);
    const find = (nodes: FileExplorerNode[], trail: string[]): { node: FileExplorerNode; trail: string[] } | null => {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (norm(node.path) === target) return { node, trail };
        } else if (node.children?.length) {
          const found = find(node.children, [...trail, node.id]);
          if (found) return found;
        }
      }
      return null;
    };
    const match = find(treeQuery.data, []);
    if (match) {
      if (match.trail.length) setExpandedFolders((prev) => new Set([...prev, ...match.trail]));
      selectFile(match.node);
    }
    onRequestConsumed?.();
  }, [requestedFilePath, treeQuery.data, selectFile, onRequestConsumed]);

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
    void queryClient.invalidateQueries({ queryKey: fileTreeKey(client.envKey) });
  }, [queryClient, client.envKey]);

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
