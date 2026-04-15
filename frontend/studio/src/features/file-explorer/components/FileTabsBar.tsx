import { FileTabsBarBase } from '@/features/code-explorer/components/FileTabsBarBase';
import { useFileExplorer } from '../providers/FileExplorerProvider';

export function FileTabsBar() {
  const { openFiles, selectedFile, selectFile, closeFile, closeAll, closeOthers, closeToLeft, closeToRight } =
    useFileExplorer();

  return (
    <FileTabsBarBase
      openFiles={openFiles}
      selectedFile={selectedFile}
      selectFile={selectFile}
      closeFile={closeFile}
      closeAll={closeAll}
      closeOthers={closeOthers}
      closeToLeft={closeToLeft}
      closeToRight={closeToRight}
    />
  );
}
