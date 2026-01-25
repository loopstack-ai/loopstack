import { ChevronDown } from 'lucide-react';
import React from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../../components/ui/collapsible.tsx';

interface DocumentDebugRendererProps {
  document: DocumentItemInterface;
}

const DocumentDebugRenderer: React.FC<DocumentDebugRendererProps> = ({ document }) => {
  return (
    <div className="mx-3 mb-2 flex justify-end">
      <Collapsible className="rounded-lg border-0 bg-gray-100 shadow-none">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
          <span className="text-gray-500">Debug Info</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="max-w-full overflow-scroll">
            <pre>{document.content}</pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DocumentDebugRenderer;
