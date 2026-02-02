import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface BasicErrorComponentProps {
  error?: string | null;
}

const BasicErrorComponent: React.FC<BasicErrorComponentProps> = ({ error }) => {
  if (!error) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};

export default BasicErrorComponent;
