import { ArrowLeft } from 'lucide-react';
import React from 'react';

const HeaderSection = ({
  icon,
  title,
  description,
  showBack,
  onBack,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  showBack?: boolean;
  onBack?: () => void;
}) => (
  <div className="mb-6">
    {showBack && (
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground group mb-4 flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Back to Selection</span>
      </button>
    )}
    <div className="flex items-start gap-4">
      <div className="border-border flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-foreground mb-1 text-xl font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>}
      </div>
    </div>
  </div>
);

export default HeaderSection;
