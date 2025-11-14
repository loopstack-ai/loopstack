import { useCallback, useRef } from 'react';

export const useScrollToListItem = () => {
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollTo = useCallback((workflowId: string) => {
    if (listRef.current && workflowId) {
      const itemToScrollTo = Array.from(listRef.current.children[0].children).find((child) =>
        (child as HTMLElement).dataset.id?.endsWith(workflowId)
      ) as HTMLElement | undefined;

      if (itemToScrollTo) {
        const elementRect = itemToScrollTo.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset - 70;

        window.scrollTo({
          top: absoluteElementTop,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  return { listRef, scrollTo };
};
