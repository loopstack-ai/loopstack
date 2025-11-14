import React from 'react';
import { Hourglass } from 'lucide-react';
import type { PipelineDto } from '@loopstack/api-client';
import Snackbar from './Snackbar';

interface StatusSnackbarProps {
  pipeline: PipelineDto | undefined;
}

const StatusSnackbar: React.FC<StatusSnackbarProps> = ({ pipeline }) => {
  const isActive = !!pipeline;

  return (
    <Snackbar
      message="Agent working..."
      variant="info"
      icon={<Hourglass className="h-4 w-4" />}
      duration={Infinity}
      id="pipeline-status"
      show={isActive}
    />
  );
};

export default StatusSnackbar;
