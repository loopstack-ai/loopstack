import React, { useEffect, useState } from 'react';
import { createClient } from '@loopstack/client';
import config from '@/config';

const OAUTH_MESSAGE_TYPE = 'loopstack:oauth:callback';
const AUTO_CLOSE_DELAY_MS = 2000;

type CallbackStatus = 'sending' | 'sent' | 'completing' | 'completed' | 'failed' | 'error';

const OAuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<CallbackStatus>('sending');
  const [failureMessage, setFailureMessage] = useState<string | undefined>();

  useEffect(() => {
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
        setFailureMessage(errorDescription ?? error);
        setStatus('failed');
        return;
      }
      if (!code || !state) {
        setFailureMessage('Missing code or state parameter.');
        setStatus('failed');
        return;
      }
      setStatus('completing');
      const client = createClient({ url: config.environment.url });
      client.http
        .post('/api/v1/oauth/complete', { code, state })
        .then(() => {
          setStatus('completed');
          setTimeout(() => {
            window.close();
          }, AUTO_CLOSE_DELAY_MS);
        })
        .catch((completionError: unknown) => {
          setFailureMessage(completionError instanceof Error ? completionError.message : undefined);
          setStatus('failed');
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
      setStatus('sent');

      setTimeout(() => {
        window.close();
      }, AUTO_CLOSE_DELAY_MS);
    } catch {
      setStatus('error');
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
        {(status === 'sending' || status === 'completing') && <p>Processing authentication...</p>}
        {(status === 'sent' || status === 'completed') && (
          <>
            <p style={{ fontSize: 18, fontWeight: 500 }}>Authentication complete</p>
            <p style={{ color: '#666', marginTop: 8 }}>This window will close automatically.</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <p style={{ fontSize: 18, fontWeight: 500 }}>Sign-in not completed</p>
            <p style={{ color: '#666', marginTop: 8 }}>
              {failureMessage ?? 'This sign-in link has expired or was already used.'}
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <p style={{ fontSize: 18, fontWeight: 500 }}>Something went wrong</p>
            <p style={{ color: '#666', marginTop: 8 }}>
              Could not communicate with the application. Please close this window and try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
