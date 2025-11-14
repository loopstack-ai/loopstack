import React from 'react';
import { cn } from '../../utils/utils.ts';

const InfoBox: React.FC<any> = ({ children }) => {
  return (
    <div
      className={cn(
        'p-6 bg-blue-50 rounded border border-blue-100 mb-4',
        'dark:bg-blue-950/50 dark:border-blue-900/50'
      )}
    >
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
};

export default InfoBox;
