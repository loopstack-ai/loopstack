import { Loader2 } from 'lucide-react';
import React from 'react';
import { cn } from '../lib/utils.ts';

interface LoadingCenteredProps extends React.HTMLAttributes<HTMLDivElement> {
  loading?: boolean;
  size?: number;
  children?: React.ReactNode;
}

const LoadingCentered: React.FC<LoadingCenteredProps> = ({
  loading = false,
  size = 24,
  children = null,
  className,
  ...props
}) => {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center', className)} {...props}>
        <Loader2 className="animate-spin" size={size} />
      </div>
    );
  }
  return <>{children}</>;
};

export default LoadingCentered;
