import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tracks whether the page has content below the viewport.
 * Returns a boolean and a function to scroll to the bottom.
 */
export function useScrollToBottom(threshold = 50) {
  const canScrollDown = useSyncExternalStore(subscribeToScroll, () => {
    const doc = document.documentElement;
    const distanceFromBottom = doc.scrollHeight - doc.scrollTop - doc.clientHeight;
    return distanceFromBottom > threshold;
  });

  const scrollToBottom = useCallback(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }, []);

  return { canScrollDown, scrollToBottom };
}

function subscribeToScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });

  // Also check periodically for content changes (query invalidations adding items)
  const interval = setInterval(onChange, 500);

  return () => {
    window.removeEventListener('scroll', onChange);
    clearInterval(interval);
  };
}
