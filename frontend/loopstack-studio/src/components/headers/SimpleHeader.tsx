import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../utils/utils.ts';

interface WorkspaceHeaderProps {
  title: string;
  type: string;
  className?: string;
}

const SimpleHeader: React.FC<WorkspaceHeaderProps> = ({ title, type, className }) => {
  return (
    <Card
      className={cn(
        'relative p-8 border-opacity-10',
        'bg-gradient-to-br from-primary/5 to-secondary/3',
        className
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-3xl font-semibold text-foreground leading-tight flex-1 min-w-0">
            {title}
          </h1>

          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary hover:bg-primary/10 font-medium text-sm h-8 px-4"
          >
            {type}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default SimpleHeader;
