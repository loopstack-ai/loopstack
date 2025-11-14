import React, { useMemo } from 'react';
import Snackbar from './Snackbar';

interface ErrorSnackbarProps {
  error: Error | string | null | undefined;
}

const ErrorSnackbar: React.FC<ErrorSnackbarProps> = ({ error }) => {
  const errorMessage = useMemo(() => {
    if (!error) return null;

    if (typeof error === 'string') {
      return error;
    } else if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred.';
  }, [error]);

  return (
    <Snackbar
      message={errorMessage}
      variant="error"
      duration={4000}
      position="bottom-center"
      show={!!error}
    />
  );
};

export default ErrorSnackbar;
