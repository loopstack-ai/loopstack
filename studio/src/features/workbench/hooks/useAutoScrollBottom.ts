import { useCallback, useEffect, useState } from 'react';

/**
 * Tracks whether the page has content below the viewport.
 * Returns a boolean and a function to scroll to the bottom.
 */
export function useScrollToBottom(threshold = 50) {
  const [canScrollDown, setCanScrollDown] = useState(false);

  const check = useCallback(() => {
    const doc = document.documentElement;
    const distanceFromBottom = doc.scrollHeight - doc.scrollTop - doc.clientHeight;
    setCanScrollDown(distanceFromBottom > threshold);
  }, [threshold]);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', check, { passive: true });
    check();

    // Also check periodically for content changes (query invalidations adding items)
    const interval = setInterval(check, 500);

    return () => {
      window.removeEventListener('scroll', check);
      clearInterval(interval);
    };
  }, [check]);

  return { canScrollDown, scrollToBottom };
}
