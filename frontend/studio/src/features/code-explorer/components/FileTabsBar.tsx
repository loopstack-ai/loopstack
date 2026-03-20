import { useCodeExplorerContext } from '../providers/CodeExplorerProvider';
import { FileTabsBarBase } from './FileTabsBarBase';

export function FileTabsBar() {
  const { openFiles, selectedFile, selectFile, closeFile, closeAll, closeOthers, closeToLeft, closeToRight } =
    useCodeExplorerContext();

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
