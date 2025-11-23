import React from 'react';
import { ArrowLeft } from 'lucide-react';

const HeaderSection = ({
                         icon,
                         title,
                         description,
                         showBack,
                         onBack
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
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Selection</span>
      </button>
    )}
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold text-foreground mb-1">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  </div>
);

export default HeaderSection;