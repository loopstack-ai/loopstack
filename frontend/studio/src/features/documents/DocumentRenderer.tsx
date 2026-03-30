import type { ComponentType } from 'react';
import React from 'react';
import type { PipelineInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface, WorkflowInterface } from '@loopstack/contracts/types';
import CompletionMessagePaper from '@/components/messages/CompletionMessagePaper.tsx';
import { OAuthPromptRenderer } from '@/features/oauth';
import AiMessage from './renderers/AiMessage.tsx';
import ChoicesRenderer from './renderers/ChoicesRenderer.tsx';
import ClaudeMessage from './renderers/ClaudeMessage.tsx';
import ConfirmPromptRenderer from './renderers/ConfirmPromptRenderer.tsx';
import DocumentDebugRenderer from './renderers/DocumentDebugRenderer.tsx';
import DocumentFormRenderer from './renderers/DocumentFormRenderer.tsx';
import DocumentMessageRenderer from './renderers/DocumentMessageRenderer.tsx';
import ErrorMessageRenderer from './renderers/ErrorMessageRenderer.tsx';
import LinkMessageRenderer from './renderers/LinkMessageRenderer.tsx';
import MarkdownMessageRenderer from './renderers/MarkdownMessageRenderer.tsx';
import PlainMessageRenderer from './renderers/PlainMessageRenderer.tsx';
import SecretInputRenderer from './renderers/SecretInputRenderer.tsx';
import TextPromptRenderer from './renderers/TextPromptRenderer.tsx';

export interface DocumentRendererProps {
  pipeline: PipelineInterface;
  workflow: WorkflowInterface;
  document: DocumentItemInterface;
  isActive: boolean;
  isLastItem: boolean;
}

type WidgetRenderer = ComponentType<DocumentRendererProps>;

/**
 * Registry mapping widget type names to their renderer components.
 * To add a new document widget, register it here — no changes to DocumentRenderer needed.
 */
const rendererRegistry = new Map<string, WidgetRenderer>([
  ['ai-message', ({ document, isLastItem }) => <AiMessage document={document} isLastItem={isLastItem} />],
  ['claude-message', ({ document, isLastItem }) => <ClaudeMessage document={document} isLastItem={isLastItem} />],
  [
    'debug',
    ({ document }) => (
      <div className="mb-4 flex">
        <DocumentDebugRenderer document={document} />
      </div>
    ),
  ],
  [
    'form',
    ({ pipeline, workflow, document, isActive }) => (
      <CompletionMessagePaper role={'document'} fullWidth={true} timestamp={new Date(document.createdAt)}>
        <DocumentFormRenderer
          pipeline={pipeline}
          workflow={workflow}
          document={document}
          enabled={isActive}
          viewOnly={!isActive}
        />
      </CompletionMessagePaper>
    ),
  ],
  ['message', ({ document }) => <DocumentMessageRenderer document={document} />],
  ['error', ({ document }) => <ErrorMessageRenderer document={document} />],
  ['plain', ({ document }) => <PlainMessageRenderer document={document} />],
  ['markdown', ({ document }) => <MarkdownMessageRenderer document={document} />],
  ['link', ({ document }) => <LinkMessageRenderer document={document} />],
  [
    'oauth-prompt',
    ({ pipeline, workflow, document, isActive }) => (
      <OAuthPromptRenderer pipeline={pipeline} workflow={workflow} document={document} isActive={isActive} />
    ),
  ],
  [
    'text-prompt',
    ({ pipeline, workflow, document, isActive }) => (
      <TextPromptRenderer pipeline={pipeline} workflow={workflow} document={document} isActive={isActive} />
    ),
  ],
  [
    'choices',
    ({ pipeline, workflow, document, isActive }) => (
      <ChoicesRenderer pipeline={pipeline} workflow={workflow} document={document} isActive={isActive} />
    ),
  ],
  [
    'confirm-prompt',
    ({ pipeline, workflow, document, isActive }) => (
      <ConfirmPromptRenderer pipeline={pipeline} workflow={workflow} document={document} isActive={isActive} />
    ),
  ],
  [
    'secret-input',
    ({ pipeline, workflow, document, isActive }) => (
      <SecretInputRenderer pipeline={pipeline} workflow={workflow} document={document} isActive={isActive} />
    ),
  ],
]);

/** Extract the primary widget name from document UI config. */
function resolveDocumentWidget(ui: unknown): string {
  const typed = ui as { widgets?: { widget?: string }[]; form?: { widget?: string } } | undefined;
  // New format: ui.widgets[0].widget
  if (typed?.widgets?.[0]?.widget) {
    return typed.widgets[0].widget;
  }
  // Legacy fallback: ui.form.widget
  if (typed?.form?.widget) {
    return typed.form.widget;
  }
  return 'form';
}

const DocumentRenderer: React.FC<DocumentRendererProps> = (props) => {
  const doc = props.document as unknown as DocumentItemInterface;
  const widget = resolveDocumentWidget(doc.ui);

  const Renderer = rendererRegistry.get(widget);

  return <div>{Renderer ? <Renderer {...props} /> : <>unknown document type</>}</div>;
};

export default DocumentRenderer;
