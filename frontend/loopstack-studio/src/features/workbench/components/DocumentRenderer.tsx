import React from 'react';
import type { DocumentItemDto, PipelineDto, WorkflowDto } from '@loopstack/api-client';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import AiMessage from '@/features/workbench/components/document-renderer/AiMessage.tsx';
import LinkMessageRenderer from '@/features/workbench/components/document-renderer/LinkMessageRenderer.tsx';
import CompletionMessagePaper from '../../../components/messages/CompletionMessagePaper.tsx';
import DocumentDebugRenderer from './document-renderer/DocumentDebugRenderer.tsx';
import DocumentFormRenderer from './document-renderer/DocumentFormRenderer.tsx';
import DocumentMessageRenderer from './document-renderer/DocumentMessageRenderer.tsx';
import ErrorMessageRenderer from './document-renderer/ErrorMessageRenderer.tsx';
import MarkdownMessageRenderer from './document-renderer/MarkdownMessageRenderer.tsx';
import PlainMessageRenderer from './document-renderer/PlainMessageRenderer.tsx';

interface DocumentRendererProps {
  pipeline: PipelineDto;
  workflow: WorkflowDto;
  document: DocumentItemDto;
  isActive: boolean;
  isLastItem: boolean;
}

const DocumentRenderer: React.FC<DocumentRendererProps> = ({ pipeline, workflow, document, isActive, isLastItem }) => {
  const viewOnly = !isActive;
  // Cast DocumentItemDto to DocumentItemInterface - they have compatible runtime structure
  const doc = document as unknown as DocumentItemInterface;
  const widget = (doc.ui?.form as { widget?: string } | undefined)?.widget ?? 'object-form';

  const render = () => {
    switch (widget) {
      case 'ai-message':
        return <AiMessage document={doc} isLastItem={isLastItem} />;
      case 'debug':
        return (
          <div className="mb-4 flex">
            <DocumentDebugRenderer document={doc} />
          </div>
        );
      case 'object-form':
        return (
          <CompletionMessagePaper role={'document'} fullWidth={true} timestamp={new Date(doc.createdAt)}>
            <DocumentFormRenderer
              pipeline={pipeline}
              workflow={workflow}
              document={doc}
              enabled={isActive}
              viewOnly={viewOnly}
            />
          </CompletionMessagePaper>
        );
      case 'message':
        return <DocumentMessageRenderer document={doc} />;
      case 'error':
        return <ErrorMessageRenderer document={doc} />;
      case 'plain':
        return <PlainMessageRenderer document={doc} />;
      case 'markdown':
        return <MarkdownMessageRenderer document={doc} />;
      case 'link':
        return <LinkMessageRenderer document={doc} />;
      default:
        return <>unknown document type</>;
    }
  };

  return <div className="mx-12">{render()}</div>;
};

export default DocumentRenderer;
