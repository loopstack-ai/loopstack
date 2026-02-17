import { useCallback, useEffect, useRef, useState } from 'react';

const OAUTH_MESSAGE_TYPE = 'loopstack:oauth:callback';
const POPUP_POLL_INTERVAL_MS = 500;
const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

export type OAuthPopupResult =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; code: string; state: string }
  | { status: 'error'; error: string }
  | { status: 'timeout' }
  | { status: 'blocked' };

interface OAuthPopupOptions {
  authUrl: string;
  state: string;
  popupWidth?: number;
  popupHeight?: number;
  timeoutMs?: number;
}

interface OAuthCallbackMessage {
  type: typeof OAUTH_MESSAGE_TYPE;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

function isOAuthCallbackMessage(data: unknown): data is OAuthCallbackMessage {
  return typeof data === 'object' && data !== null && (data as OAuthCallbackMessage).type === OAUTH_MESSAGE_TYPE;
}

function openCenteredPopup(url: string, width: number, height: number): Window | null {
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
  const features = `width=${width},height=${height},left=${left},top=${top},popup=yes,noopener=no`;
  return window.open(url, 'loopstack-oauth', features);
}

export function useOAuthPopup() {
  const [result, setResult] = useState<OAuthPopupResult>({ status: 'idle' });
  const popupRef = useRef<Window | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    stateRef.current = null;
  }, []);

  const closePopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
  }, []);

  // Message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isOAuthCallbackMessage(event.data)) return;
      if (!stateRef.current) return;

      const msg = event.data;

      if (msg.error) {
        setResult({
          status: 'error',
          error: msg.errorDescription || msg.error,
        });
      } else if (msg.code && msg.state) {
        if (msg.state !== stateRef.current) {
          setResult({ status: 'error', error: 'State mismatch. Possible CSRF attack.' });
        } else {
          setResult({ status: 'success', code: msg.code, state: msg.state });
        }
      } else {
        setResult({ status: 'error', error: 'Invalid callback response.' });
      }

      cleanup();
      closePopup();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [cleanup, closePopup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const open = useCallback(
    (options: OAuthPopupOptions) => {
      const { authUrl, state, popupWidth = 500, popupHeight = 700, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

      // Clean up any previous flow
      cleanup();
      closePopup();

      stateRef.current = state;

      const popup = openCenteredPopup(authUrl, popupWidth, popupHeight);

      if (!popup) {
        setResult({ status: 'blocked' });
        return;
      }

      popupRef.current = popup;
      setResult({ status: 'pending' });

      // Poll for popup closed by user
      pollRef.current = setInterval(() => {
        if (popup.closed) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          // Only set error if we haven't already received a result
          setResult((prev) =>
            prev.status === 'pending' ? { status: 'error', error: 'Authentication window was closed.' } : prev,
          );
          cleanup();
        }
      }, POPUP_POLL_INTERVAL_MS);

      // Timeout
      timeoutRef.current = setTimeout(() => {
        setResult((prev) => (prev.status === 'pending' ? { status: 'timeout' } : prev));
        cleanup();
        closePopup();
      }, timeoutMs);
    },
    [cleanup, closePopup],
  );

  const reset = useCallback(() => {
    cleanup();
    closePopup();
    setResult({ status: 'idle' });
  }, [cleanup, closePopup]);

  return { result, open, reset };
}
