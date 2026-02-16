import React, { useEffect, useState } from 'react';

const OAUTH_MESSAGE_TYPE = 'loopstack:oauth:callback';
const AUTO_CLOSE_DELAY_MS = 2000;

type CallbackStatus = 'sending' | 'sent' | 'no-opener' | 'error';

const OAuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<CallbackStatus>('sending');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (!window.opener) {
      setStatus('no-opener');
      return;
    }

    // Validate opener origin matches our own origin
    try {
      const message = error
        ? { type: OAUTH_MESSAGE_TYPE, error, errorDescription: errorDescription ?? undefined, state: state ?? undefined }
        : { type: OAUTH_MESSAGE_TYPE, code, state };

      window.opener.postMessage(message, window.location.origin);
      setStatus('sent');

      setTimeout(() => {
        window.close();
      }, AUTO_CLOSE_DELAY_MS);
    } catch {
      setStatus('error');
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
        {status === 'sending' && <p>Processing authentication...</p>}
        {status === 'sent' && (
          <>
            <p style={{ fontSize: 18, fontWeight: 500 }}>Authentication complete</p>
            <p style={{ color: '#666', marginTop: 8 }}>This window will close automatically.</p>
          </>
        )}
        {status === 'no-opener' && (
          <>
            <p style={{ fontSize: 18, fontWeight: 500 }}>Invalid access</p>
            <p style={{ color: '#666', marginTop: 8 }}>
              This page handles OAuth callbacks. Please start the authentication from within the application.
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
