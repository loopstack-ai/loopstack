import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';

type ErrorMessageContentType = {
  error: string;
};

interface ErrorMessageRendererProps {
  document: Omit<DocumentItemInterface, 'content'> & { content: ErrorMessageContentType };
}

const ErrorMessageRenderer: React.FC<ErrorMessageRendererProps> = ({ document }) => {
  return (
    <Alert variant="destructive" className="w-auto">
      <AlertDescription>{document.content.error}</AlertDescription>
    </Alert>
  );
};

export default ErrorMessageRenderer;
