import React from 'react';
import type { PipelineDto } from '@loopstack/api-client';
import CompletionMessagePaper from '../../../components/messages/CompletionMessagePaper.tsx';
import DocumentDebugRenderer from './document-renderer/DocumentDebugRenderer.tsx';
import DocumentFormRenderer from './document-renderer/DocumentFormRenderer.tsx';
import DocumentMessageRenderer from './document-renderer/DocumentMessageRenderer.tsx';
import ErrorMessageRenderer from './document-renderer/ErrorMessageRenderer.tsx';
import PlainMessageRenderer from './document-renderer/PlainMessageRenderer.tsx';
import MarkdownMessageRenderer from './document-renderer/MarkdownMessageRenderer.tsx';
import AiMessage from '@/features/workbench/components/document-renderer/AiMessage.tsx';
import type { DocumentItemInterface, WorkflowInterface } from '@loopstack/contracts/types';

interface DocumentRendererProps {
  pipeline: PipelineDto;
  workflow: WorkflowInterface;
  document: DocumentItemInterface;
  isActive: boolean;
  isLastItem: boolean;
}

const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  pipeline,
  workflow,
  document,
  isActive,
  isLastItem,
}) => {
  const viewOnly = !isActive;
  const widget = document.ui?.form?.widget ?? 'object-form';

  const render = () => {
    switch (widget) {
      case 'ai-message':
        return <AiMessage document={document} isLastItem={isLastItem} />
      case 'debug':
        return (
          <div className="flex mb-4">
            <DocumentDebugRenderer document={document} />
          </div>
        );
      case 'object-form':
        return (
          <CompletionMessagePaper
            role={'document'}
            fullWidth={true}
            timestamp={new Date(document.createdAt)}
          >
            <DocumentFormRenderer
              pipeline={pipeline}
              workflow={workflow}
              document={document}
              enabled={isActive}
              viewOnly={viewOnly}
            />
          </CompletionMessagePaper>
        );
      case 'chat-message':
        return <DocumentMessageRenderer document={document} />;
      case 'error-message':
        return <ErrorMessageRenderer document={document} />;
      case 'plain-message':
        return <PlainMessageRenderer document={document} />;
      case 'markdown-message':
        return <MarkdownMessageRenderer document={document} />;
      default:
        return <>unknown document type</>;
    }
  };

  return <div className="mx-12">{render()}</div>;
};

export default DocumentRenderer;
