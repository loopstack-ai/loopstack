import { useCallback, useEffect, useRef, useState } from 'react';

export const useIntersectionObserver = (rootMargin: string = '0px') => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const observedElements = useRef(new Map<Element, boolean>());

  useEffect(() => {
    const elementsMap = observedElements.current;

    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-id');
          if (!id) return;

          if (entry.isIntersecting) {
            elementsMap.set(entry.target, true);
          } else {
            elementsMap.set(entry.target, false);
          }
        });

        const elements = Array.from(elementsMap.entries())
          .filter(([, isVisible]) => isVisible)
          .map(([element]) => element.getAttribute('data-id'))
          .filter((sectionId) => null !== sectionId)
          .sort();

        if (elements.length) {
          setActiveId(elements[0]);
        }
      },
      {
        root: document.querySelector('.list-container'),
        threshold: 0.05,
        rootMargin,
      },
    );

    return () => {
      observer.current?.disconnect();
      elementsMap.clear();
    };
  }, [rootMargin]);

  const observe = useCallback((element: HTMLElement | null) => {
    if (element) observer.current?.observe(element);
  }, []);

  return {
    activeId,
    observe,
  };
};
