import { useScrollToBottom } from './useAutoScrollBottom.ts';
import { useScrollToListItem } from './useScrollToListItem.ts';

export function useWorkflowListState() {
  const { listRef, scrollTo } = useScrollToListItem();
  const { canScrollDown, scrollToBottom } = useScrollToBottom();

  return {
    listRef,
    scrollTo,
    canScrollDown,
    scrollToBottom,
  };
}
