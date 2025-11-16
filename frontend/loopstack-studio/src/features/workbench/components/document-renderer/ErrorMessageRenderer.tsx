import React from 'react';
import CompletionMessagePaper from '../../../../components/messages/CompletionMessagePaper.tsx';
import { Alert, AlertDescription } from '../../../../components/ui/alert.tsx';

interface ErrorMessageRendererProps {
  document: any; //TODO: Define a more specific type for document
}

const ErrorMessageRenderer: React.FC<ErrorMessageRendererProps> = ({ document }) => {
  return (
    <CompletionMessagePaper role={'error'}>
      <Alert variant="destructive">
        <AlertDescription>{document.content.message}</AlertDescription>
      </Alert>
    </CompletionMessagePaper>
  );
};

export default ErrorMessageRenderer;
