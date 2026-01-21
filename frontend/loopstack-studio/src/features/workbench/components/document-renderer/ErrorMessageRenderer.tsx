import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';

interface ErrorMessageRendererProps {
  document: any; //TODO: Define a more specific type for document
}

const ErrorMessageRenderer: React.FC<ErrorMessageRendererProps> = ({ document }) => {
  return (
    <Alert variant="destructive" className="w-auto">
      <AlertDescription>{document.content.error}</AlertDescription>
    </Alert>
  );
};

export default ErrorMessageRenderer;
