import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { FileExplorerNode } from '../../code-explorer/types';

interface RemoteFileExplorerContextValue {
  nodes: FileExplorerNode[];
  isTreeLoading: boolean;
  treeError: Error | null;
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
  isFetchingTree: boolean;
}

const RemoteFileExplorerContext = createContext<RemoteFileExplorerContextValue | null>(null);

interface RemoteFileExplorerProviderProps {
  children: React.ReactNode;
}

export function RemoteFileExplorerProvider({ children }: RemoteFileExplorerProviderProps) {
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [openFiles, setOpenFiles] = useState<FileExplorerNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileExplorerNode | null>(null);

  const treeQuery = useQuery({
    queryKey: ['remote-agent-file-tree'],
    queryFn: async (): Promise<FileExplorerNode[]> => {
      const base = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000';
      const path = './src';
      const res = await fetch(`${base}/api/v1/files/tree?path=${path}`, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load file tree (${res.status}): ${text}`);
      }
      return (await res.json()) as FileExplorerNode[];
    },
    staleTime: 30_000,
  });

  const contentQuery = useQuery({
    queryKey: ['remote-agent-file-content', selectedFile?.path],
    queryFn: async (): Promise<string> => {
      const base = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000';
      const url = new URL(`${base}/api/v1/files/read`);
      url.searchParams.set('path', selectedFile!.path);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to read file (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { content: string };
      return data.content;
    },
    enabled: !!selectedFile && selectedFile.type === 'file',
    staleTime: 15_000,
  });

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
    void queryClient.invalidateQueries({ queryKey: ['remote-agent-file-tree'] });
  }, [queryClient]);

  const value = useMemo<RemoteFileExplorerContextValue>(
    () => ({
      nodes: treeQuery.data ?? [],
      isTreeLoading: treeQuery.isLoading && !treeQuery.data,
      treeError: treeQuery.error,
      openFiles,
      selectedFile,
      fileContent: contentQuery.data ?? null,
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
      isFetchingTree: treeQuery.isFetching,
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

  return <RemoteFileExplorerContext.Provider value={value}>{children}</RemoteFileExplorerContext.Provider>;
}

export function useRemoteFileExplorer(): RemoteFileExplorerContextValue {
  const ctx = useContext(RemoteFileExplorerContext);
  if (!ctx) {
    throw new Error('useRemoteFileExplorer must be used within RemoteFileExplorerProvider');
  }
  return ctx;
}

export function useOptionalRemoteFileExplorer(): RemoteFileExplorerContextValue | null {
  return useContext(RemoteFileExplorerContext);
}
