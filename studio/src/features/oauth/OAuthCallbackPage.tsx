import React, { useSyncExternalStore } from 'react';
import { createClient } from '@loopstack/client';
import config from '@/config';

const OAUTH_MESSAGE_TYPE = 'loopstack:oauth:callback';
const AUTO_CLOSE_DELAY_MS = 2000;

type CallbackStatus = 'sending' | 'sent' | 'completing' | 'completed' | 'failed' | 'error';

interface CallbackState {
  status: CallbackStatus;
  failureMessage?: string;
}

// The callback is handled once per page load, outside React; the page subscribes to its state.
const SENDING: CallbackState = { status: 'sending' };
let callbackState: CallbackState | undefined;
const listeners = new Set<() => void>();

function setCallbackState(next: CallbackState) {
  callbackState = next;
  listeners.forEach((listener) => listener());
}

function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  const errorDescription = params.get('error_description');

  // No opener: the flow was not started from a Studio popup (e.g. a
  // CLI-printed auth URL opened directly). Complete the exchange through
  // the public backend endpoint — the single-use state token resolves the
  // pending workflow server-side.
  if (!window.opener) {
    if (error) {
      setCallbackState({ status: 'failed', failureMessage: errorDescription ?? error });
      return;
    }
    if (!code || !state) {
      setCallbackState({ status: 'failed', failureMessage: 'Missing code or state parameter.' });
      return;
    }
    setCallbackState({ status: 'completing' });
    const client = createClient({ url: config.environment.url });
    client.http
      .post('/api/v1/oauth/complete', { code, state })
      .then(() => {
        setCallbackState({ status: 'completed' });
        setTimeout(() => {
          window.close();
        }, AUTO_CLOSE_DELAY_MS);
      })
      .catch((completionError: unknown) => {
        setCallbackState({
          status: 'failed',
          failureMessage: completionError instanceof Error ? completionError.message : undefined,
        });
      });
    return;
  }

  // Validate opener origin matches our own origin
  try {
    const message = error
      ? {
          type: OAUTH_MESSAGE_TYPE,
          error,
          errorDescription: errorDescription ?? undefined,
          state: state ?? undefined,
        }
      : { type: OAUTH_MESSAGE_TYPE, code, state };

    (window.opener as Window).postMessage(message, window.location.origin);
    setCallbackState({ status: 'sent' });

    setTimeout(() => {
      window.close();
    }, AUTO_CLOSE_DELAY_MS);
  } catch {
    setCallbackState({ status: 'error' });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!callbackState) handleCallback();
  return () => listeners.delete(listener);
}

function getCallbackState() {
  return callbackState ?? SENDING;
}

const OAuthCallbackPage: React.FC = () => {
  const { status, failureMessage } = useSyncExternalStore(subscribe, getCallbackState);

  return (
    <div className="bg-background text-foreground flex min-h-screen items-center justify-center font-sans">
      <div className="max-w-100 p-6 text-center">
        {(status === 'sending' || status === 'completing') && <p>Processing authentication...</p>}
        {(status === 'sent' || status === 'completed') && (
          <>
            <p className="text-lg font-medium">Authentication complete</p>
            <p className="text-muted-foreground mt-2">This window will close automatically.</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <p className="text-lg font-medium">Sign-in not completed</p>
            <p className="text-muted-foreground mt-2">
              {failureMessage ?? 'This sign-in link has expired or was already used.'}
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-lg font-medium">Something went wrong</p>
            <p className="text-muted-foreground mt-2">
              Could not communicate with the application. Please close this window and try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
