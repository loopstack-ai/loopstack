import React, { useCallback, useEffect, useRef } from 'react';
import type { PipelineDto, WorkflowDto } from '@loopstack/api-client';
import type {
  DocumentItemInterface,
  TransitionPayloadInterface,
  UiWidgetType,
  WorkflowTransitionType,
} from '@loopstack/contracts/types';
import CompletionMessagePaper from '@/components/messages/CompletionMessagePaper.tsx';
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { useOAuthPopup } from './useOAuthPopup.ts';
import type { OAuthPopupResult } from './useOAuthPopup.ts';

interface OAuthPromptContent {
  provider: string;
  authUrl: string;
  state: string;
  status?: 'pending' | 'success' | 'error';
  message?: string;
}

interface OAuthPromptRendererProps {
  pipeline: PipelineDto;
  workflow: WorkflowDto;
  document: DocumentItemInterface;
  isActive: boolean;
}

const OAuthPromptRenderer: React.FC<OAuthPromptRendererProps> = ({ pipeline, workflow, document, isActive }) => {
  const content = document.content as OAuthPromptContent;
  const actions: UiWidgetType[] = document.ui?.actions ?? [];
  const transitionId = actions.find((a) => a.transition)?.transition;

  const runPipeline = useRunPipeline();
  const { result, open, reset } = useOAuthPopup();
  const submittedRef = useRef(false);

  const availableTransitions = workflow.availableTransitions?.map((t) => (t as WorkflowTransitionType).id) ?? [];

  const triggerTransition = useCallback(
    (code: string, state: string) => {
      if (!transitionId || !availableTransitions.includes(transitionId)) return;

      runPipeline.mutate({
        pipelineId: pipeline.id,
        runPipelinePayloadDto: {
          transition: {
            id: transitionId,
            workflowId: workflow.id,
            payload: { code, state },
          } as TransitionPayloadInterface,
        },
      });
    },
    [transitionId, availableTransitions, runPipeline, pipeline.id, workflow.id],
  );

  // When popup succeeds, trigger the backend transition
  useEffect(() => {
    if (result.status === 'success' && !submittedRef.current) {
      submittedRef.current = true;
      triggerTransition(result.code, result.state);
    }
  }, [result, triggerTransition]);

  const handleSignIn = () => {
    submittedRef.current = false;
    open({ authUrl: content.authUrl, state: content.state });
  };

  const handleRetry = () => {
    reset();
    submittedRef.current = false;
    open({ authUrl: content.authUrl, state: content.state });
  };

  // If the backend already marked this as success (e.g. on page reload after completion)
  if (content.status === 'success') {
    return (
      <CompletionMessagePaper>
        <StatusDisplay status="success" provider={content.provider} message={content.message} />
      </CompletionMessagePaper>
    );
  }

  if (content.status === 'error') {
    return (
      <CompletionMessagePaper>
        <StatusDisplay status="error" provider={content.provider} message={content.message} />
        {isActive && <RetryButton onClick={handleRetry} />}
      </CompletionMessagePaper>
    );
  }

  return (
    <CompletionMessagePaper>
      <PopupResultView
        result={result}
        provider={content.provider}
        isActive={isActive}
        isSubmitting={runPipeline.isPending}
        onSignIn={handleSignIn}
        onRetry={handleRetry}
      />
    </CompletionMessagePaper>
  );
};

// --- Sub-components ---

const ProviderLabel: React.FC<{ provider: string }> = ({ provider }) => {
  const label = provider.charAt(0).toUpperCase() + provider.slice(1);
  return <>{label}</>;
};

const StatusDisplay: React.FC<{ status: 'success' | 'error'; provider: string; message?: string }> = ({
  status,
  provider,
  message,
}) => (
  <div className="flex items-center gap-3 py-1">
    {status === 'success' ? (
      <>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 text-sm">
          &#10003;
        </span>
        <div>
          <div className="text-sm font-medium">
            Connected to <ProviderLabel provider={provider} />
          </div>
          {message && <div className="text-xs text-gray-500 mt-0.5">{message}</div>}
        </div>
      </>
    ) : (
      <>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 text-sm">
          &#10007;
        </span>
        <div>
          <div className="text-sm font-medium">Authentication failed</div>
          {message && <div className="text-xs text-red-500 mt-0.5">{message}</div>}
        </div>
      </>
    )}
  </div>
);

const RetryButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="mt-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
  >
    Try again
  </button>
);

const PopupResultView: React.FC<{
  result: OAuthPopupResult;
  provider: string;
  isActive: boolean;
  isSubmitting: boolean;
  onSignIn: () => void;
  onRetry: () => void;
}> = ({ result, provider, isActive, isSubmitting, onSignIn, onRetry }) => {
  switch (result.status) {
    case 'idle':
      return (
        <div className="py-1">
          <div className="text-sm font-medium mb-1">
            Connect your <ProviderLabel provider={provider} /> account
          </div>
          <div className="text-xs text-gray-500 mb-3">
            This workflow needs access to your <ProviderLabel provider={provider} /> resources.
          </div>
          {isActive && (
            <button
              onClick={onSignIn}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Sign in with <ProviderLabel provider={provider} />
            </button>
          )}
        </div>
      );

    case 'pending':
      return (
        <div className="py-1">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            <div className="text-sm font-medium">Waiting for authentication...</div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Complete the sign-in in the popup window.</div>
          {isActive && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={onRetry}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      );

    case 'success':
      return (
        <div className="py-1">
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              <div className="text-sm font-medium">Completing authentication...</div>
            </div>
          ) : (
            <StatusDisplay status="success" provider={provider} />
          )}
        </div>
      );

    case 'error':
      return (
        <div className="py-1">
          <StatusDisplay status="error" provider={provider} message={result.error} />
          {isActive && <RetryButton onClick={onRetry} />}
        </div>
      );

    case 'timeout':
      return (
        <div className="py-1">
          <StatusDisplay status="error" provider={provider} message="Authentication timed out." />
          {isActive && <RetryButton onClick={onRetry} />}
        </div>
      );

    case 'blocked':
      return (
        <div className="py-1">
          <StatusDisplay
            status="error"
            provider={provider}
            message="Popup was blocked by the browser. Please allow popups for this site and try again."
          />
          {isActive && <RetryButton onClick={onRetry} />}
        </div>
      );
  }
};

export default OAuthPromptRenderer;
