import React from 'react';
import type { DocumentItemDto, PipelineDto, WorkflowItemDto } from '@loopstack/api-client';
import CompletionMessagePaper from '../../../../components/messages/CompletionMessagePaper.tsx';
import DocumentDebugRenderer from './DocumentRenderer/DocumentDebugRenderer.tsx';
import DocumentFormRenderer from './DocumentRenderer/DocumentFormRenderer.tsx';
import DocumentMessageRenderer from './DocumentRenderer/DocumentMessageRenderer.tsx';
import ErrorMessageRenderer from './DocumentRenderer/ErrorMessageRenderer.tsx';
import PlainMessageRenderer from './DocumentRenderer/PlainMessageRenderer.tsx';
import MarkdownMessageRenderer from './DocumentRenderer/MarkdownMessageRenderer.tsx';

interface DocumentRendererProps {
  pipeline: PipelineDto;
  workflow: WorkflowItemDto;
  document: DocumentItemDto;
  isActive: boolean;
}

const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  pipeline,
  workflow,
  document,
  isActive
}) => {
  const viewOnly = !isActive;

  // @ts-ignore
  const widget = document.ui?.['widget'] ?? 'object-form';

  const render = () => {
    switch (widget) {
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
