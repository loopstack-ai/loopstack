import { FileTabsBarBase } from '../../code-explorer/components/FileTabsBarBase';
import { useRemoteFileExplorer } from '../providers/RemoteFileExplorerProvider';

export function RemoteFileTabsBar() {
  const { openFiles, selectedFile, selectFile, closeFile, closeAll, closeOthers, closeToLeft, closeToRight } =
    useRemoteFileExplorer();

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
