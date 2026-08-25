import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { useOAuthPopup } from '@/features/oauth';
import type { RunPromptProps } from './types.ts';

interface OAuthPromptContent {
  provider?: string;
  authUrl?: string;
  state?: string;
  status?: 'pending' | 'success' | 'error';
  message?: string;
}

function providerLabel(provider: string | undefined): string {
  if (!provider) return 'Provider';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * `oauth-prompt`: opens the provider's auth URL in a popup; a successful callback fires
 * the transition with `{ code, state }` (the legacy renderer's flow). Backend-written
 * `content.status` short-circuits to a status display.
 */
export function OAuthPrompt({ view, submit, isSubmitting }: RunPromptProps) {
  const content = (view.content ?? {}) as OAuthPromptContent;
  const { result, open, reset } = useOAuthPopup();
  const submittedRef = useRef(false);
  const label = providerLabel(content.provider);

  const start = useCallback(() => {
    if (!content.authUrl || !content.state) return;
    submittedRef.current = false;
    reset();
    open({ authUrl: content.authUrl, state: content.state });
  }, [content.authUrl, content.state, open, reset]);

  useEffect(() => {
    if (result.status === 'success' && !submittedRef.current) {
      submittedRef.current = true;
      submit({ code: result.code, state: result.state });
    }
  }, [result, submit]);

  if (content.status === 'success') {
    return (
      <p className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-600" /> Connected to {label}.
      </p>
    );
  }

  const failure =
    content.status === 'error'
      ? (content.message ?? `Signing in to ${label} failed.`)
      : result.status === 'error'
        ? result.error
        : result.status === 'timeout'
          ? 'The sign-in timed out.'
          : result.status === 'blocked'
            ? 'The popup was blocked — allow popups and retry.'
            : undefined;
  if (failure) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm">
          <AlertCircle className="text-destructive h-4 w-4" />
          {failure}
        </p>
        <Button variant="outline" onClick={start} disabled={isSubmitting}>
          Retry
        </Button>
      </div>
    );
  }

  const busy = isSubmitting || result.status === 'pending' || result.status === 'success';
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Sign in with {label} to continue.</p>
      <Button onClick={start} disabled={busy || !content.authUrl}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
        Sign in with {label}
      </Button>
    </div>
  );
}
