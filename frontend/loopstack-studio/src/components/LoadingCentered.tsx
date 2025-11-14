import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/utils.ts';

interface LoadingCenteredProps extends React.HTMLAttributes<HTMLDivElement> {
  loading?: boolean;
  size?: number;
}

const LoadingCentered: React.FC<LoadingCenteredProps> = ({
  loading = false,
  size = 24,
  className,
  ...props
}) => {
  return loading ? (
    <div className={cn('flex justify-center items-center', className)} {...props}>
      <Loader2 className="animate-spin" size={size} />
    </div>
  ) : (
    <></>
  );
};

export default LoadingCentered;
